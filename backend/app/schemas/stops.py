from typing import Optional, List
from pydantic import BaseModel, Field
from .common import Coordinates, TransportMode, DataStatus, SeatingStatus

class Stop(BaseModel):
    id: str = Field(..., description="Unique stop identifier (e.g. BMTC ID or Metro station code)")
    name: str = Field(..., description="Official stop or station name")
    description: Optional[str] = Field(None, description="Stop direction or contextual landmark")
    coordinates: Coordinates = Field(..., description="Geographic coordinates")
    mode: TransportMode = Field(..., description="BMTC bus stop or Namma Metro station")
    data_status: DataStatus = Field(DataStatus.STATIC, description="Status of the stop location data")
    lines: List[str] = Field(default_factory=list, description="Metro lines or bus routes serving this stop")
    distance_meters: Optional[float] = Field(None, description="Distance from requested query coordinates in meters")
    live_arrivals_available: bool = Field(False, description="Whether live telemetry is streaming for this stop")
    occupancy_status: SeatingStatus = Field(SeatingStatus.UNKNOWN, description="Live or predicted crowd level")

class NearbyStopsResponse(BaseModel):
    query_coordinates: Coordinates
    radius_meters: float
    mode_filter: Optional[TransportMode] = None
    count: int
    stops: List[Stop]
    data_status: DataStatus = DataStatus.STATIC
    provenance: str = "Local verified BMTC/BMRCL spatial catalog"

class StopSearchResponse(BaseModel):
    query: str
    count: int
    results: List[Stop]
    data_status: DataStatus = DataStatus.STATIC

