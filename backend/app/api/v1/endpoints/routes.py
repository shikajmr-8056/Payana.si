from fastapi import APIRouter, Query, HTTPException, Path as FPath
from typing import Optional

from ....core.config import settings
from ....schemas.common import TransportMode
from ....schemas.routes import TransitRoute, RouteListResponse
from ....data.transit_repository import TransitRepository

router = APIRouter()

@router.get("", response_model=RouteListResponse)
def list_routes(
    q: Optional[str] = Query(None, description="Search route number or corridor name"),
    mode: Optional[TransportMode] = Query(None, description="Filter by mode: BUS or METRO"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results")
) -> RouteListResponse:
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    return repo.get_routes(query=q, mode_filter=mode, limit=limit)

@router.get("/{route_id}", response_model=TransitRoute)
def get_route_details(
    route_id: str = FPath(..., description="Service or route ID")
) -> TransitRoute:
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    repo.initialize()

    # Check Metro routes
    for r in repo.metro.routes.values():
        if r.id == route_id or r.short_name.lower() == route_id.lower():
            return r

    # Check BMTC routes
    bmtc_route = repo.bmtc.get_route_by_id(route_id)
    if bmtc_route:
        return bmtc_route

    # Try matching short_name if exact service ID not matched
    matching = repo.bmtc.search_routes(route_id, limit=1)
    if matching:
        return matching[0]

    raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found.")

