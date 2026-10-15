"""
WasteWise-AI: Pydantic Schemas
==============================
Defines request and response data models for API validation and OpenAPI documentation.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check status and service information."""

    status: str = Field(..., description="System health status (e.g., 'healthy')")
    model_loaded: bool = Field(..., description="Whether the CNN inference model is loaded in memory")
    model_path: str = Field(..., description="Configured path to the trained model artifact")
    version: str = Field(..., description="API software version")


class ClassProbability(BaseModel):
    """Individual class prediction probability score."""

    class_id: int = Field(..., description="Integer ID of the waste class (0..5)")
    class_name: str = Field(..., description="Name of the waste class (e.g. 'cardboard', 'glass')")
    probability: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")


class RecyclingGuidance(BaseModel):
    """Actionable recycling bin recommendation and preparation guidance."""

    bin_name: str = Field(..., description="Recommended recycling bin or waste stream category")
    bin_color: str = Field(..., description="Common municipal color coding for this bin")
    instructions: List[str] = Field(..., description="Step-by-step preparation and disposal instructions")
    disclaimer: str = Field(..., description="Notice that local municipal rules may differ")


class PredictionResponse(BaseModel):
    """Complete prediction response returned to the client."""

    predicted_class: str = Field(..., description="Top predicted waste category")
    predicted_class_id: int = Field(..., description="Integer identifier of the top predicted class")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence probability of the top class")
    probabilities: List[ClassProbability] = Field(
        ..., description="Probabilities for all six waste classes"
    )
    guidance: RecyclingGuidance = Field(
        ..., description="Recycling bin and disposal guidance for the predicted category"
    )
    filename: Optional[str] = Field(None, description="Original filename of the uploaded image")


class ErrorResponse(BaseModel):
    """Standardized error response payload."""

    error: str = Field(..., description="High-level error classification")
    detail: str = Field(..., description="Detailed explanation of the failure")
