from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class DataStatus(str, Enum):
    STATIC = "STATIC"            # Static route geometry, station coordinates, stop list
    SCHEDULED = "SCHEDULED"      # Published timetable, first/last operating time, nominal intervals
    LIVE = "LIVE"                # Verified telemetry from active vehicle GPS / GTFS-RT feed
    PREDICTED = "PREDICTED"      # Algorithmic or ML-estimated ETA / occupancy
    UNAVAILABLE = "UNAVAILABLE"  # Explicitly missing, unverified, or not accessible

class TransportMode(str, Enum):
    BUS = "BUS"
    METRO = "METRO"
    WALK = "WALK"

class SeatingStatus(str, Enum):
    SEATS_LIKELY = "SEATS_LIKELY"
    LIMITED_SEATING = "LIMITED_SEATING"
    STANDING_ONLY = "STANDING_ONLY"
    UNKNOWN = "UNKNOWN"

class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 Longitude")

class DataProvenance(BaseModel):
    source_name: str
    source_url: Optional[str] = None
    data_status: DataStatus
    last_updated: str
    license: str
    is_live_telemetry: bool = False
    reliability_notes: str

