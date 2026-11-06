import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "Payana Transit Intelligence Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Path to local public/data/transit repository assets
    DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "public" / "data" / "transit"
    DATA_DIR: Path = Path(os.getenv("TRANSIT_DATA_DIR", str(DEFAULT_DATA_DIR)))
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

settings = Settings()
