"""Configuration and settings management."""

import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    openai_api_key: str = ""
    groq_api_key: str = ""
    jina_api_key: str = ""

    # Model settings
    groq_model: str = "llama-3.3-70b-versatile"
    embedding_model: str = "text-embedding-3-small"
    embedding_provider: str = "openai"

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 50

    # Retrieval
    top_k_retrieval: int = 10

    # Storage paths
    chroma_persist_dir: str = str(Path.home() / ".reposcope" / "chroma")
    sqlite_db_path: str = str(Path.home() / ".reposcope" / "reposcope.db")
    repos_dir: str = str(Path.home() / ".reposcope" / "repos")

    # Server settings
    server_host: str = "127.0.0.1"
    server_port: int = 8745
    server_timeout: int = 300  # seconds

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

