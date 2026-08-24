import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "OptimusKG Graph Backend"
    API_V1_STR: str = "/api/v1"
    
    # Rutas a los datos Parquet
    CACHE_DIR: str = os.path.expanduser("~/.cache/optimuskg/doi_10_7910_DVN_IYNGEV/2.0")
    NODES_PARQUET: str = os.path.join(CACHE_DIR, "nodes.parquet")
    EDGES_PARQUET: str = os.path.join(CACHE_DIR, "edges.parquet")
    
    # Configuración de DuckDB / Motor
    DUCKDB_THREADS: int = 4
    DUCKDB_MEMORY_LIMIT: str = "4GB"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

