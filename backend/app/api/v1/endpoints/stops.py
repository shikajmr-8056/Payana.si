from fastapi import APIRouter, Query, HTTPException, Path as FPath
from typing import Optional

from ....core.config import settings
from ....schemas.common import TransportMode
from ....schemas.stops import Stop, NearbyStopsResponse, StopSearchResponse
from ....data.transit_repository import TransitRepository
from ....data.geo_utils import is_valid_lat_lng

router = APIRouter()

@router.get("/nearby", response_model=NearbyStopsResponse)
def get_nearby_stops(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    radius_meters: float = Query(1000.0, gt=0, le=15000.0, description="Search radius in meters"),
    mode: Optional[TransportMode] = Query(None, description="Filter by mode: BUS or METRO"),
    limit: int = Query(25, ge=1, le=100, description="Maximum number of stops to return")
) -> NearbyStopsResponse:
    if not is_valid_lat_lng(lat, lng):
        raise HTTPException(status_code=400, detail="Invalid geographic coordinates provided.")
    
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    return repo.find_nearby_stops(
        lat=lat,
        lng=lng,
        radius_meters=radius_meters,
        mode_filter=mode,
        limit=limit
    )

@router.get("/search", response_model=StopSearchResponse)
def search_stops(
    q: str = Query(..., min_length=1, description="Stop name query keyword"),
    mode: Optional[TransportMode] = Query(None, description="Filter by mode: BUS or METRO"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results")
) -> StopSearchResponse:
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    return repo.search_stops(query=q, mode_filter=mode, limit=limit)

@router.get("/{stop_id}", response_model=Stop)
def get_stop_details(
    stop_id: str = FPath(..., description="Unique stop ID")
) -> Stop:
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    repo.initialize()

    # Check Metro stations first
    if stop_id in repo.metro.stations:
        return repo.metro.stations[stop_id]
    
    # Check BMTC stops
    bmtc_stop = repo.bmtc.get_stop_by_id(stop_id)
    if bmtc_stop:
        return bmtc_stop
    
    raise HTTPException(status_code=404, detail=f"Stop '{stop_id}' not found.")

