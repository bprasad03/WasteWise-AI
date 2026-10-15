"""
WasteWise-AI: FastAPI Application Entry Point
==============================================
Provides high-performance inference endpoints for waste classification,
health monitoring, and recycling bin recommendations.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.schemas import (
    ErrorResponse,
    HealthResponse,
    PredictionResponse,
)
from backend.services.model_service import model_service

# Configure backend logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("wastewise.api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager:
    Loads the trained CNN model artifact into memory once at startup.
    """
    logger.info("Initializing WasteWise-AI backend application...")
    try:
        model_service.load_model()
        logger.info("CNN inference model loaded successfully on startup.")
    except Exception as exc:
        logger.error(
            "Failed to load model during startup: %s. "
            "Inference endpoint will return 503 until resolved.",
            exc,
        )
    yield
    logger.info("Shutting down WasteWise-AI backend application...")


# FastAPI Application instance
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for local web development and frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/",
    tags=["Root"],
    summary="API Root Information",
    response_model=dict,
)
async def root() -> dict:
    """Returns basic API service metadata and documentation links."""
    return {
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "environment": settings.ENV,
        "docs_url": "/docs",
        "health_url": "/health",
        "predict_url": "/api/v1/predict",
    }


@app.get(
    "/health",
    tags=["Health"],
    summary="Health Check (Root)",
    response_model=HealthResponse,
)
@app.get(
    "/api/v1/health",
    tags=["Health"],
    summary="Health Check (API v1)",
    response_model=HealthResponse,
)
async def health_check() -> HealthResponse:
    """
    Reports API service health and current model loading status.
    """
    is_loaded = model_service.is_loaded()
    return HealthResponse(
        status="healthy" if is_loaded else "degraded",
        model_loaded=is_loaded,
        model_path=str(settings.MODEL_PATH),
        version=settings.API_VERSION,
    )


@app.post(
    "/api/v1/predict",
    tags=["Inference"],
    summary="Predict Waste Category & Recycling Guidance",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid file format or corrupted image"},
        413: {"model": ErrorResponse, "description": "Uploaded image exceeds size limit"},
        503: {"model": ErrorResponse, "description": "Model not loaded or unavailable"},
    },
)
async def predict_waste(
    file: UploadFile = File(..., description="Uploaded waste image (JPG, JPEG, or PNG)"),
) -> PredictionResponse:
    """
    Accepts an uploaded waste item image, validates format and size, runs
    preprocessing matching the CNN training pipeline (224x224 RGB [0, 1]),
    predicts the waste category with confidence scores, and returns
    actionable recycling bin guidance with a local rules disclaimer.
    """
    # 1. Validate filename and file extension
    filename = file.filename or "unknown"
    file_ext = Path(filename).suffix.lower()

    if not file_ext or file_ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file extension '{file_ext}'. "
                f"Allowed formats: {', '.join(sorted(settings.ALLOWED_IMAGE_EXTENSIONS))}"
            ),
        )

    # 2. Validate MIME content type if provided
    if file.content_type:
        content_type = file.content_type.lower()
        if (
            content_type not in settings.ALLOWED_CONTENT_TYPES
            and content_type != "application/octet-stream"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Unsupported Content-Type '{file.content_type}'. "
                    f"Allowed media types: {', '.join(sorted(settings.ALLOWED_CONTENT_TYPES))}"
                ),
            )

    # 3. Read image contents with size cap
    # Read up to MAX_UPLOAD_SIZE_BYTES + 1 to detect oversized payloads safely
    max_bytes = settings.MAX_UPLOAD_SIZE_BYTES
    try:
        contents = await file.read(max_bytes + 1)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file payload: {exc}",
        )

    if len(contents) > max_bytes:
        max_mb = max_bytes / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File size exceeds maximum permitted limit of {max_mb:.1f} MB.",
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes). Please upload a valid image.",
        )

    # 4. Verify model is loaded
    if not model_service.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Inference model is currently not loaded. "
                "Check server logs for model loading errors."
            ),
        )

    # 5. Run inference with robust exception handling
    try:
        result = model_service.predict(contents, filename=filename)
        return result
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image decoding failed: {val_err}",
        )
    except RuntimeError as run_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model inference failed: {run_err}",
        )
