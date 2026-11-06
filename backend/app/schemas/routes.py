from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from .common import TransportMode, DataStatus

class RoutePattern(BaseModel):
    direction_id: str
    destination_name: Optional[str] = None
    stop_ids: List[str]
    stop_count: int

class TransitRoute(BaseModel):
    id: str = Field(..., description="Route / Service identifier")
    short_name: str = Field(..., description="Route code, e.g. 510 or Purple")
    long_name: str = Field(..., description="Route corridor description")
    mode: TransportMode = Field(..., description="Transit mode")
    color: Optional[str] = Field(None, description="Hex color for map & UI badges")
    data_status: DataStatus = Field(DataStatus.STATIC, description="Status of route geometry & pattern")
    patterns: List[RoutePattern] = Field(default_factory=list, description="Directional stop patterns")
    operating_hours_raw: Optional[List[str]] = Field(None, description="First/last timing intervals if available")
    live_tracking_available: bool = Field(False, description="Whether live GPS feed is verified and active")
    live_active_vehicles: Optional[int] = Field(None, description="Count of live buses, null if unavailable")

class RouteListResponse(BaseModel):
    count: int
    query: Optional[str] = None
    mode_filter: Optional[TransportMode] = None
    routes: List[TransitRoute]
    data_status: DataStatus = DataStatus.STATIC

