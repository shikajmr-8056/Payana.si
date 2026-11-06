import json
import logging
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from ..schemas.common import Coordinates, DataStatus, TransportMode, SeatingStatus
from ..schemas.stops import Stop
from ..schemas.routes import TransitRoute, RoutePattern
from .geo_utils import haversine_distance, get_bounding_box, is_valid_lat_lng

logger = logging.getLogger("payana.metro_adapter")

# Official line metadata
METRO_LINES_METADATA = {
    "Purple Line": {
        "color": "#a855f7", # or #e542de
        "corridor": "Challaghatta ⇔ Whitefield (Kadugodi)",
        "terminus_a": "Challaghatta",
        "terminus_b": "Whitefield (Kadugodi)",
        "frequency_peak_mins": 5,
        "frequency_offpeak_mins": 8,
        "operational_hours": "05:00 - 23:00",
    },
    "Green Line": {
        "color": "#22c55e", # or #009933
        "corridor": "Madavara ⇔ Silk Institute",
        "terminus_a": "Madavara",
        "terminus_b": "Silk Institute",
        "frequency_peak_mins": 5,
        "frequency_offpeak_mins": 8,
        "operational_hours": "05:00 - 23:00",
    },
    "Yellow Line": {
        "color": "#eab308",
        "corridor": "Delta Electronics Bommasandra ⇔ RV Road",
        "terminus_a": "Delta Electronics Bommasandra",
        "terminus_b": "Rashtreeya Vidyalaya Road",
        "frequency_peak_mins": 10,
        "frequency_offpeak_mins": 15,
        "operational_hours": "06:00 - 22:00 (Phased preview)",
    }
}

class MetroAdapter:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.stations: Dict[str, Stop] = {}
        self.routes: Dict[str, TransitRoute] = {}
        self.is_loaded = False

    def load_data(self) -> None:
        """Loads Namma Metro stations and alignments from rail.json."""
        if self.is_loaded:
            return

        rail_path = self.data_dir / "rail.json"
        if not rail_path.exists():
            logger.warning(f"rail.json not found at {rail_path}")
            return

        try:
            with open(rail_path, "r", encoding="utf-8") as f:
                geojson_data = json.load(f)

            features = geojson_data.get("features", [])
            station_features = [f for f in features if f.get("geometry", {}).get("type") == "Point"]
            line_features = [f for f in features if f.get("geometry", {}).get("type") == "LineString"]

            # 1. Parse Metro Stations
            for idx, feat in enumerate(station_features):
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})
                coords = geom.get("coordinates", [])

                if len(coords) < 2:
                    continue

                lng, lat = float(coords[0]), float(coords[1])
                if not is_valid_lat_lng(lat, lng):
                    continue

                station_name = props.get("name", f"Metro Station {idx+1}").strip()
                station_id = f"metro_{station_name.lower().replace(' ', '_').replace('-', '_')}"
                station_color = props.get("station-color", "#a855f7")

                # Determine line association by station-color
                lines = []
                if station_color.lower() in ("#009933", "#22c55e", "#15803d"):
                    lines.append("Green Line")
                elif station_color.lower() in ("#e542de", "#a855f7", "#9333ea"):
                    lines.append("Purple Line")
                elif station_color.lower() in ("#eab308", "#ca8a04", "#facc15"):
                    lines.append("Yellow Line")
                else:
                    lines.append("Namma Metro")

                # Check major interchanges
                if any(kw in station_name.lower() for kw in ["majestic", "kempegowda"]):
                    lines = ["Purple Line", "Green Line"]
                elif any(kw in station_name.lower() for kw in ["rv road", "rashtreeya vidyalaya"]):
                    lines = ["Green Line", "Yellow Line"]

                self.stations[station_id] = Stop(
                    id=station_id,
                    name=station_name,
                    description="Namma Metro Station",
                    coordinates=Coordinates(latitude=lat, longitude=lng),
                    mode=TransportMode.METRO,
                    data_status=DataStatus.STATIC,
                    lines=lines,
                    distance_meters=None,
                    live_arrivals_available=False,
                    occupancy_status=SeatingStatus.UNKNOWN,
                )

            logger.info(f"Loaded {len(self.stations)} Namma Metro stations.")

            # 2. Parse Metro Lines / Routes
            for idx, line_feat in enumerate(line_features):
                props = line_feat.get("properties", {})
                ref = props.get("ref", f"Line {idx+1}")
                full_name = props.get("name", f"Metro {ref}")
                stroke = props.get("stroke", "#a855f7")

                line_key = f"{ref} Line" if not ref.endswith("Line") else ref
                meta = METRO_LINES_METADATA.get(line_key, {})

                # Find stations along this line
                line_station_ids = [
                    sid for sid, s in self.stations.items()
                    if line_key in s.lines
                ]

                pattern = RoutePattern(
                    direction_id="0",
                    destination_name=meta.get("terminus_b", "Terminus"),
                    stop_ids=line_station_ids,
                    stop_count=len(line_station_ids)
                )

                self.routes[line_key] = TransitRoute(
                    id=line_key.lower().replace(" ", "-"),
                    short_name=line_key,
                    long_name=full_name,
                    mode=TransportMode.METRO,
                    color=stroke,
                    data_status=DataStatus.STATIC,
                    patterns=[pattern],
                    operating_hours_raw=[meta.get("operational_hours", "05:00 - 23:00")],
                    live_tracking_available=False,
                    live_active_vehicles=None
                )

            logger.info(f"Loaded {len(self.routes)} Namma Metro lines.")
            self.is_loaded = True

        except Exception as e:
            logger.error(f"Failed to load rail.json: {e}", exc_info=True)

    def search_stations(self, query: str, limit: int = 15) -> List[Stop]:
        q = query.strip().lower()
        if not q:
            return []

        matches: List[Tuple[int, Stop]] = []
        for s in self.stations.values():
            name_lower = s.name.lower()
            if name_lower.startswith(q):
                matches.append((0, s))
            elif f" {q}" in name_lower:
                matches.append((1, s))
            elif q in name_lower:
                matches.append((2, s))

        matches.sort(key=lambda x: (x[0], len(x[1].name)))
        return [m[1] for m in matches[:limit]]

    def find_nearby_stations(self, lat: float, lng: float, radius_meters: float = 1500.0, limit: int = 10) -> List[Stop]:
        if not is_valid_lat_lng(lat, lng):
            return []

        min_lat, max_lat, min_lng, max_lng = get_bounding_box(lat, lng, radius_meters)
        candidates: List[Tuple[float, Stop]] = []

        for station in self.stations.values():
            s_lat = station.coordinates.latitude
            s_lng = station.coordinates.longitude

            if min_lat <= s_lat <= max_lat and min_lng <= s_lng <= max_lng:
                dist = haversine_distance(lat, lng, s_lat, s_lng)
                if dist <= radius_meters:
                    s_copy = station.model_copy()
                    s_copy.distance_meters = round(dist, 1)
                    candidates.append((dist, s_copy))

        candidates.sort(key=lambda x: x[0])
        return [c[1] for c in candidates[:limit]]

    def calculate_metro_fare(self, distance_meters: float) -> int:
        """Official BMRCL distance-based fare table."""
        dist_km = distance_meters / 1000.0
        if dist_km <= 2.0:
            return 10
        elif dist_km <= 4.0:
            return 15
        elif dist_km <= 6.0:
            return 20
        elif dist_km <= 8.0:
            return 25
        elif dist_km <= 10.0:
            return 30
        elif dist_km <= 15.0:
            return 40
        elif dist_km <= 20.0:
            return 50
        else:
            return 60

