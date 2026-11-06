from fastapi import APIRouter
from .endpoints import health, stops, routes, catalog

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(stops.router, prefix="/transit/stops", tags=["stops"])
api_router.include_router(routes.router, prefix="/transit/routes", tags=["routes"])
api_router.include_router(catalog.router, prefix="/transit", tags=["catalog"])

