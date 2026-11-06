import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from .core.config import settings
from .api.v1.api import api_router
from .api.v1.endpoints.health import get_health, HealthResponse
from .data.transit_repository import TransitRepository

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("payana.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: preload static catalog once
    logger.info("Initializing Payana transit repository...")
    repo = TransitRepository.get_instance(settings.DATA_DIR)
    repo.initialize()
    logger.info("Transit repository ready.")
    yield
    logger.info("Payana transit backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Genuine data-driven multimodal transit intelligence backend for Bengaluru combining BMTC buses and Namma Metro.",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Top-level /health route alias for quick load balancer checks
@app.get("/health", response_model=HealthResponse, tags=["health"])
def root_health():
    return get_health()

# Top-level /transit/catalog and /transit/sources aliases
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router)  # Also expose without /api/v1 for convenience

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "error": "Validation Error",
            "details": exc.errors(),
            "data_status": "UNAVAILABLE"
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if settings.DEBUG else "An unexpected error occurred.",
            "data_status": "UNAVAILABLE"
        }
    )
