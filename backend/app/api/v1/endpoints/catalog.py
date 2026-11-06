from fastapi import APIRouter
from typing import List

from ....core.config import settings
from ....schemas.sources import DataCatalogResponse, DataSourceDetail
from ....data.transit_repository import TransitRepository
from ....data.source_registry import get_data_sources_registry

router = APIRouter()

@router.get("/catalog", response_model=DataCatalogResponse)
def get_transit_catalog() -> DataCatalogResponse:
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    repo.initialize()
    return repo.get_catalog()

@router.get("/sources", response_model=List[DataSourceDetail])
def get_transit_sources() -> List[DataSourceDetail]:
    return get_data_sources_registry(settings.DATA_DIR)

