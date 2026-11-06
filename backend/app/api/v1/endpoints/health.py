from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any

from ....core.config import settings
from ....data.transit_repository import TransitRepository

router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    data_loaded: bool
    bmtc_stops_count: int
    bmtc_routes_count: int
    metro_stations_count: int
    metro_lines_count: int
    live_telemetry_status: str
    crowd_occupancy_status: str

@router.get("", response_model=HealthResponse)
def get_health() -> HealthResponse:
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    repo.initialize()
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        data_loaded=repo._initialized,
        bmtc_stops_count=len(repo.bmtc.stops),
        bmtc_routes_count=len(repo.bmtc.routes),
        metro_stations_count=len(repo.metro.stations),
        metro_lines_count=len(repo.metro.routes),
        live_telemetry_status="UNAVAILABLE (Simulation/Preview only)",
        crowd_occupancy_status="UNKNOWN (No crowd sensors connected)"
    )

