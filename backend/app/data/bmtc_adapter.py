import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from ..schemas.common import Coordinates, DataStatus, TransportMode, SeatingStatus
from ..schemas.stops import Stop
from ..schemas.routes import TransitRoute, RoutePattern
from .geo_utils import haversine_distance, get_bounding_box, is_valid_lat_lng

logger = logging.getLogger("payana.bmtc_adapter")

class BMTCAdapter:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.stops: Dict[str, Stop] = {}
        self.routes: Dict[str, TransitRoute] = {}
        self.stop_to_routes: Dict[str, set[str]] = {}
        self.stop_firstlast: Dict[str, List[str]] = {}
        self.is_loaded = False

    def load_data(self) -> None:
        """Loads and indexes BMTC stops, routes, and schedules from JSON files."""
        if self.is_loaded:
            return

        stops_path = self.data_dir / "stops.min.json"
        services_path = self.data_dir / "services.min.json"
        firstlast_path = self.data_dir / "firstlast.min.json"

        # 1. Load Bus Stops
        if stops_path.exists():
            try:
                with open(stops_path, "r", encoding="utf-8") as f:
                    raw_stops = json.load(f)
                
                for stop_id, val in raw_stops.items():
                    if not isinstance(val, list) or len(val) < 3:
                        continue
                    lng, lat, name = val[0], val[1], val[2]
                    desc = val[3] if len(val) > 3 and val[3] else None
                    
                    if not (isinstance(lng, (int, float)) and isinstance(lat, (int, float))):
                        continue
                    if not is_valid_lat_lng(lat, lng):
                        continue

                    self.stops[str(stop_id)] = Stop(
                        id=str(stop_id),
                        name=str(name).strip(),
                        description=str(desc).strip() if desc else None,
                        coordinates=Coordinates(latitude=lat, longitude=lng),
                        mode=TransportMode.BUS,
                        data_status=DataStatus.STATIC,
                        lines=[],
                        distance_meters=None,
                        live_arrivals_available=False,
                        occupancy_status=SeatingStatus.UNKNOWN,
                    )
                logger.info(f"Loaded {len(self.stops)} BMTC bus stops.")
            except Exception as e:
                logger.error(f"Failed to load stops.min.json: {e}", exc_info=True)
        else:
            logger.warning(f"stops.min.json not found at {stops_path}")

        # 2. Load Services / Routes
        if services_path.exists():
            try:
                with open(services_path, "r", encoding="utf-8") as f:
                    raw_services = json.load(f)

                for service_id, s_data in raw_services.items():
                    if not isinstance(s_data, dict):
                        continue
                    
                    route_name = s_data.get("name", str(service_id))
                    # Route number is usually the service ID or first token
                    short_name = str(service_id).split()[0]
                    patterns: List[RoutePattern] = []

                    # Parse directional stop patterns
                    for dir_key, dir_val in s_data.items():
                        if dir_key == "name":
                            continue
                        if isinstance(dir_val, list) and len(dir_val) > 0:
                            # Typically dir_val is list of lists of stop IDs: [[stop1, stop2, ...]]
                            flat_stops: List[str] = []
                            if isinstance(dir_val[0], list):
                                flat_stops = [str(sid) for sid in dir_val[0]]
                            else:
                                flat_stops = [str(sid) for sid in dir_val]
                            
                            dest_name = None
                            if flat_stops and flat_stops[-1] in self.stops:
                                dest_name = self.stops[flat_stops[-1]].name

                            pattern = RoutePattern(
                                direction_id=str(dir_key),
                                destination_name=dest_name,
                                stop_ids=flat_stops,
                                stop_count=len(flat_stops)
                            )
                            patterns.append(pattern)

                            # Record stop to route mapping
                            for sid in flat_stops:
                                if sid not in self.stop_to_routes:
                                    self.stop_to_routes[sid] = set()
                                self.stop_to_routes[sid].add(short_name)

                    self.routes[str(service_id)] = TransitRoute(
                        id=str(service_id),
                        short_name=short_name,
                        long_name=route_name,
                        mode=TransportMode.BUS,
                        color="#2563eb",  # Standard BMTC blue
                        data_status=DataStatus.STATIC,
                        patterns=patterns,
                        operating_hours_raw=None,
                        live_tracking_available=False,
                        live_active_vehicles=None
                    )
                logger.info(f"Loaded {len(self.routes)} BMTC bus services.")
            except Exception as e:
                logger.error(f"Failed to load services.min.json: {e}", exc_info=True)
        else:
            logger.warning(f"services.min.json not found at {services_path}")

        # Attach serving lines to stops
        for sid, stop_obj in self.stops.items():
            if sid in self.stop_to_routes:
                stop_obj.lines = sorted(list(self.stop_to_routes[sid]))

        # 3. Load First/Last timings if present
        if firstlast_path.exists():
            try:
                with open(firstlast_path, "r", encoding="utf-8") as f:
                    self.stop_firstlast = json.load(f)
                logger.info(f"Loaded first/last timings for {len(self.stop_firstlast)} stops.")
            except Exception as e:
                logger.error(f"Failed to load firstlast.min.json: {e}", exc_info=True)

        self.is_loaded = True

    def get_stop_by_id(self, stop_id: str) -> Optional[Stop]:
        return self.stops.get(str(stop_id))

    def get_route_by_id(self, route_id: str) -> Optional[TransitRoute]:
        return self.routes.get(str(route_id))

    def search_stops(self, query: str, limit: int = 15) -> List[Stop]:
        q = query.strip().lower()
        if not q:
            return []
        
        matches: List[Tuple[int, Stop]] = []
        for stop in self.stops.values():
            name_lower = stop.name.lower()
            desc_lower = stop.description.lower() if stop.description else ""
            
            # Prioritize prefix matches, then substring matches
            if name_lower.startswith(q):
                matches.append((0, stop))
            elif f" {q}" in name_lower:
                matches.append((1, stop))
            elif q in name_lower:
                matches.append((2, stop))
            elif q in desc_lower:
                matches.append((3, stop))

            if len(matches) >= limit * 3:
                break

        matches.sort(key=lambda x: (x[0], len(x[1].name)))
        return [m[1] for m in matches[:limit]]

    def find_nearby_stops(self, lat: float, lng: float, radius_meters: float = 800.0, limit: int = 20) -> List[Stop]:
        if not is_valid_lat_lng(lat, lng):
            return []

        min_lat, max_lat, min_lng, max_lng = get_bounding_box(lat, lng, radius_meters)
        candidates: List[Tuple[float, Stop]] = []

        for stop in self.stops.values():
            s_lat = stop.coordinates.latitude
            s_lng = stop.coordinates.longitude
            
            # Fast Bounding Box check
            if min_lat <= s_lat <= max_lat and min_lng <= s_lng <= max_lng:
                dist = haversine_distance(lat, lng, s_lat, s_lng)
                if dist <= radius_meters:
                    # Clone stop to attach distance
                    stop_copy = stop.model_copy()
                    stop_copy.distance_meters = round(dist, 1)
                    candidates.append((dist, stop_copy))

        candidates.sort(key=lambda x: x[0])
        return [c[1] for c in candidates[:limit]]

    def search_routes(self, query: str, limit: int = 20) -> List[TransitRoute]:
        q = query.strip().lower()
        if not q:
            return list(self.routes.values())[:limit]

        matches: List[Tuple[int, TransitRoute]] = []
        for r in self.routes.values():
            short_lower = r.short_name.lower()
            long_lower = r.long_name.lower()

            if short_lower == q:
                matches.append((0, r))
            elif short_lower.startswith(q):
                matches.append((1, r))
            elif q in short_lower:
                matches.append((2, r))
            elif q in long_lower:
                matches.append((3, r))

            if len(matches) >= limit * 2:
                break

        matches.sort(key=lambda x: (x[0], len(x[1].short_name)))
        return [m[1] for m in matches[:limit]]

