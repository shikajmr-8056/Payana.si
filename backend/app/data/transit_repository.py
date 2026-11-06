import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

from ..schemas.common import Coordinates, DataStatus, TransportMode
from ..schemas.stops import Stop, NearbyStopsResponse, StopSearchResponse
from ..schemas.routes import TransitRoute, RouteListResponse
from ..schemas.sources import DataCatalogResponse
from .bmtc_adapter import BMTCAdapter
from .metro_adapter import MetroAdapter
from .source_registry import get_data_sources_registry

logger = logging.getLogger("payana.repository")

class TransitRepository:
    _instance: Optional["TransitRepository"] = None

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.bmtc = BMTCAdapter(data_dir)
        self.metro = MetroAdapter(data_dir)
        self._initialized = False

    @classmethod
    def get_instance(cls, data_dir: Path) -> "TransitRepository":
        if cls._instance is None:
            cls._instance = cls(data_dir)
        return cls._instance

    def initialize(self) -> None:
        if self._initialized:
            return
        logger.info(f"Initializing TransitRepository from {self.data_dir}...")
        self.bmtc.load_data()
        self.metro.load_data()
        self._initialized = True
        logger.info("TransitRepository successfully initialized.")

    def search_stops(
        self,
        query: str,
        mode_filter: Optional[TransportMode] = None,
        limit: int = 20
    ) -> StopSearchResponse:
        self.initialize()
        results: List[Stop] = []

        if mode_filter is None or mode_filter == TransportMode.METRO:
            metro_results = self.metro.search_stations(query, limit=limit)
            results.extend(metro_results)

        if mode_filter is None or mode_filter == TransportMode.BUS:
            remaining = limit - len(results)
            if remaining > 0:
                bmtc_results = self.bmtc.search_stops(query, limit=remaining)
                results.extend(bmtc_results)

        return StopSearchResponse(
            query=query,
            count=len(results),
            results=results[:limit],
            data_status=DataStatus.STATIC
        )

    def find_nearby_stops(
        self,
        lat: float,
        lng: float,
        radius_meters: float = 1000.0,
        mode_filter: Optional[TransportMode] = None,
        limit: int = 25
    ) -> NearbyStopsResponse:
        self.initialize()
        stops: List[Stop] = []

        if mode_filter is None or mode_filter == TransportMode.METRO:
            metro_stops = self.metro.find_nearby_stations(lat, lng, radius_meters=radius_meters, limit=limit)
            stops.extend(metro_stops)

        if mode_filter is None or mode_filter == TransportMode.BUS:
            bus_limit = limit - len(stops) if mode_filter is None else limit
            if bus_limit > 0:
                bus_stops = self.bmtc.find_nearby_stops(lat, lng, radius_meters=radius_meters, limit=bus_limit)
                stops.extend(bus_stops)

        # Sort combined results by distance
        stops.sort(key=lambda s: (s.distance_meters if s.distance_meters is not None else 999999))

        return NearbyStopsResponse(
            query_coordinates=Coordinates(latitude=lat, longitude=lng),
            radius_meters=radius_meters,
            mode_filter=mode_filter,
            count=len(stops[:limit]),
            stops=stops[:limit],
            data_status=DataStatus.STATIC,
            provenance="Verified BMTC and BMRCL spatial index"
        )

    def get_routes(
        self,
        query: Optional[str] = None,
        mode_filter: Optional[TransportMode] = None,
        limit: int = 50
    ) -> RouteListResponse:
        self.initialize()
        routes: List[TransitRoute] = []

        if mode_filter is None or mode_filter == TransportMode.METRO:
            for r in self.metro.routes.values():
                if not query or query.lower() in r.short_name.lower() or query.lower() in r.long_name.lower():
                    routes.append(r)

        if mode_filter is None or mode_filter == TransportMode.BUS:
            bus_routes = self.bmtc.search_routes(query or "", limit=limit)
            routes.extend(bus_routes)

        return RouteListResponse(
            count=len(routes[:limit]),
            query=query,
            mode_filter=mode_filter,
            routes=routes[:limit],
            data_status=DataStatus.STATIC
        )

    def get_catalog(self) -> DataCatalogResponse:
        sources = get_data_sources_registry(self.data_dir)
        return DataCatalogResponse(
            total_sources=len(sources),
            system_status="HEALTHY - REAL LOCAL ASSETS LOADED",
            bmtc_stops_count=len(self.bmtc.stops),
            bmtc_services_count=len(self.bmtc.routes),
            metro_stations_count=len(self.metro.stations),
            metro_lines_count=len(self.metro.routes),
            sources=sources,
            limitations_summary=(
                "All routes, stops, and schedules reflect verified local datasets from BMTC and BMRCL. "
                "Real-time vehicle GPS positions and crowd sensors are currently unavailable and marked accordingly."
            )
        )

