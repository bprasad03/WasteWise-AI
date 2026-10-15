"""
WasteWise-AI: Backend Configuration
====================================
Centralized application settings, path resolution, and inference constraints.
Supports configuration via environment variables with safe defaults.
"""

import os
from pathlib import Path
from typing import Set, Tuple


class Settings:
    """Application configuration and environment settings."""

    # Project root is 2 levels up from backend/app/ (i.e., root of WasteWise-AI)
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent

    # API Metadata
    API_TITLE: str = "WasteWise-AI Inference API"
    API_DESCRIPTION: str = (
        "Production-ready inference backend for waste classification and recycling guidance "
        "powered by the verified damped custom CNN."
    )
    API_VERSION: str = "1.0.0"

    # Environment
    ENV: str = os.getenv("WASTEWISE_ENV", "development")

    # Host & Port
    HOST: str = os.getenv("WASTEWISE_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("WASTEWISE_PORT", "8000"))

    # Model & Artifact Paths (resolved relative to project root)
    MODEL_PATH: Path = Path(
        os.getenv(
            "WASTEWISE_MODEL_PATH",
            str(PROJECT_ROOT / "ml" / "outputs" / "exp_damped" / "wastewise_cnn.keras"),
        )
    )

    CLASS_MAPPING_PATH: Path = Path(
        os.getenv(
            "WASTEWISE_CLASS_MAPPING_PATH",
            str(PROJECT_ROOT / "ml" / "outputs" / "exp_damped" / "class_mapping.json"),
        )
    )

    # Preprocessing & Inference Constraints
    IMAGE_SIZE: Tuple[int, int] = (224, 224)
    NUM_CLASSES: int = 6

    # File Upload Limits & Formats
    # Default 10 MB maximum upload size
    MAX_UPLOAD_SIZE_BYTES: int = int(
        os.getenv("WASTEWISE_MAX_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024))
    )

    ALLOWED_IMAGE_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png"}
    ALLOWED_CONTENT_TYPES: Set[str] = {
        "image/jpeg",
        "image/jpg",
        "image/png",
    }

    @classmethod
    def resolve_path(cls, path_input: str | Path) -> Path:
        """
        Resolves a path relative to the project root if it is not already absolute.
        """
        p = Path(path_input)
        if p.is_absolute():
            return p
        return (cls.PROJECT_ROOT / p).resolve()


settings = Settings()
