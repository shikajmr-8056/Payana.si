from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from .common import DataStatus

class DataSourceDetail(BaseModel):
    id: str = Field(..., description="Unique source slug")
    name: str = Field(..., description="Human readable dataset title")
    provider: str = Field(..., description="Data provider or maintainer")
    source_url: Optional[str] = Field(None, description="Upstream origin repository or official endpoint")
    format: str = Field(..., description="JSON / GeoJSON / GTFS / GTFS-RT")
    local_path: Optional[str] = Field(None, description="Local relative file path inside project")
    license: str = Field(..., description="License terms (ODbL, MIT, Open Data, or Proprietary)")
    data_status: DataStatus = Field(..., description="Verification tier: STATIC, SCHEDULED, LIVE, or UNAVAILABLE")
    coverage_scope: str = Field(..., description="Bengaluru Metropolitan Region scope")
    record_count: Optional[int] = Field(None, description="Number of parsed stops/routes/features")
    file_size_bytes: Optional[int] = Field(None, description="File size on disk in bytes")
    last_updated: str = Field(..., description="Timestamp of file modification or fetch")
    known_limitations: List[str] = Field(default_factory=list, description="Truth-in-advertising caveats")

class DataCatalogResponse(BaseModel):
    total_sources: int
    system_status: str
    bmtc_stops_count: int
    bmtc_services_count: int
    metro_stations_count: int
    metro_lines_count: int
    sources: List[DataSourceDetail]
    limitations_summary: str

