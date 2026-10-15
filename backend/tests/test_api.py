"""
WasteWise-AI: FastAPI Backend Integration & Unit Tests
======================================================
Tests health checks, upload validation, error responses, mocked model inference,
and end-to-end integration with the real damped CNN model artifact.
"""

import io
from pathlib import Path
from unittest.mock import MagicMock

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.config import settings
from backend.app.main import app
from backend.services.model_service import model_service


@pytest.fixture(autouse=True)
def ensure_test_client():
    """Provides a fresh TestClient without triggering lifespan reloading every test."""
    with TestClient(app) as client:
        yield client


def create_sample_jpeg_bytes(size=(224, 224), color=(100, 150, 200)) -> bytes:
    """Creates in-memory JPEG test image."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# -------------------------------------------------------------------------
# Health & Root Endpoint Tests
# -------------------------------------------------------------------------

def test_root_endpoint(ensure_test_client):
    """GET / returns service information and navigation links."""
    response = ensure_test_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == settings.API_TITLE
    assert data["docs_url"] == "/docs"
    assert data["predict_url"] == "/api/v1/predict"


def test_health_endpoint(ensure_test_client):
    """GET /health reports status, model path, and API version."""
    response = ensure_test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "model_loaded" in data
    assert "version" in data
    assert data["version"] == settings.API_VERSION


def test_api_v1_health_endpoint(ensure_test_client):
    """GET /api/v1/health mirrors root health check."""
    response = ensure_test_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert "model_loaded" in data


# -------------------------------------------------------------------------
# Image Prediction Endpoint Tests (Mocked Model)
# -------------------------------------------------------------------------

def test_predict_endpoint_with_mocked_model(ensure_test_client, monkeypatch):
    """
    POST /api/v1/predict with mocked CNN inference:
    Verifies response structure, confidence score, all 6 class probabilities,
    recycling guidance, and local municipal disclaimer.
    """
    # Create mock prediction returning highest probability for 'metal' (index 2)
    mock_probs = np.array([[0.05, 0.05, 0.75, 0.05, 0.05, 0.05]], dtype=np.float32)

    mock_model = MagicMock()
    mock_model.return_value = mock_probs

    monkeypatch.setattr(model_service, "model", mock_model)
    monkeypatch.setattr(
        model_service,
        "id_to_class",
        {0: "cardboard", 1: "glass", 2: "metal", 3: "paper", 4: "plastic", 5: "trash"},
    )

    jpeg_bytes = create_sample_jpeg_bytes()
    files = {"file": ("test_can.jpg", jpeg_bytes, "image/jpeg")}

    response = ensure_test_client.post("/api/v1/predict", files=files)
    assert response.status_code == 200, f"Expected 200, got: {response.text}"

    data = response.json()
    assert data["predicted_class"] == "metal"
    assert data["predicted_class_id"] == 2
    assert data["confidence"] == pytest.approx(0.75, abs=1e-4)
    assert data["filename"] == "test_can.jpg"

    # Verify all six class probabilities
    probs = data["probabilities"]
    assert len(probs) == 6
    prob_classes = {p["class_name"] for p in probs}
    expected_classes = {"cardboard", "glass", "metal", "paper", "plastic", "trash"}
    assert prob_classes == expected_classes

    # Verify probability sum is approximately 1.0
    total_prob = sum(p["probability"] for p in probs)
    assert pytest.approx(total_prob, abs=1e-3) == 1.0

    # Verify recycling guidance and disclaimer
    guidance = data["guidance"]
    assert guidance["bin_name"] == "Metals & Cans Recycling Bin"
    assert guidance["bin_color"]
    assert len(guidance["instructions"]) > 0
    assert "Guidance only" in guidance["disclaimer"]
    assert "municipality" in guidance["disclaimer"].lower()


# -------------------------------------------------------------------------
# Upload Validation and Error Handling Tests
# -------------------------------------------------------------------------

def test_predict_rejects_unsupported_extension(ensure_test_client):
    """POST /api/v1/predict rejects disallowed file extensions (.txt, .pdf, etc.)."""
    files = {"file": ("notes.txt", b"Hello world text file", "text/plain")}
    response = ensure_test_client.post("/api/v1/predict", files=files)

    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_predict_rejects_empty_file(ensure_test_client):
    """POST /api/v1/predict returns 400 when an empty (0 byte) file is uploaded."""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = ensure_test_client.post("/api/v1/predict", files=files)

    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_predict_rejects_corrupted_image(ensure_test_client):
    """POST /api/v1/predict returns 400 when byte content is not a valid image."""
    files = {"file": ("broken.jpg", b"corrupted random data not an image", "image/jpeg")}
    response = ensure_test_client.post("/api/v1/predict", files=files)

    assert response.status_code == 400
    assert "decoding failed" in response.json()["detail"].lower()


def test_predict_rejects_oversized_file(ensure_test_client, monkeypatch):
    """POST /api/v1/predict returns 413 Payload Too Large if image exceeds size limit."""
    # Temporarily set max upload to 500 bytes for test
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 500)

    jpeg_bytes = create_sample_jpeg_bytes()  # typically > 1000 bytes
    assert len(jpeg_bytes) > 500

    files = {"file": ("large.jpg", jpeg_bytes, "image/jpeg")}
    response = ensure_test_client.post("/api/v1/predict", files=files)

    assert response.status_code == 413
    assert "exceeds maximum permitted limit" in response.json()["detail"]


def test_predict_handles_model_not_loaded(ensure_test_client, monkeypatch):
    """POST /api/v1/predict returns 503 Service Unavailable when model is not loaded."""
    monkeypatch.setattr(model_service, "model", None)

    jpeg_bytes = create_sample_jpeg_bytes()
    files = {"file": ("sample.png", jpeg_bytes, "image/png")}

    response = ensure_test_client.post("/api/v1/predict", files=files)
    assert response.status_code == 503
    assert "model is currently not loaded" in response.json()["detail"].lower()


def test_predict_handles_inference_runtime_error(ensure_test_client, monkeypatch):
    """POST /api/v1/predict returns 500 if the model forward pass raises an exception."""
    mock_model = MagicMock(side_effect=RuntimeError("GPU memory exhaustion"))
    monkeypatch.setattr(model_service, "model", mock_model)

    jpeg_bytes = create_sample_jpeg_bytes()
    files = {"file": ("error.jpg", jpeg_bytes, "image/jpeg")}

    response = ensure_test_client.post("/api/v1/predict", files=files)
    assert response.status_code == 500
    assert "model inference failed" in response.json()["detail"].lower()


# -------------------------------------------------------------------------
# Integration Test with the Real Damped Model Artifact
# -------------------------------------------------------------------------

def test_predict_with_real_damped_model(ensure_test_client):
    """
    End-to-end integration test: Loads the real verified damped CNN model
    from ml/outputs/exp_damped/wastewise_cnn.keras and runs a real forward pass.
    """
    model_path = settings.resolve_path(settings.MODEL_PATH)
    if not model_path.exists():
        pytest.skip(f"Damped model artifact not found at {model_path}")

    # Ensure real model is loaded
    if not model_service.is_loaded():
        model_service.load_model(model_path)

    sample_bytes = create_sample_jpeg_bytes(size=(224, 224), color=(60, 180, 75))
    files = {"file": ("integration_test_sample.jpg", sample_bytes, "image/jpeg")}

    response = ensure_test_client.post("/api/v1/predict", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["predicted_class"] in {"cardboard", "glass", "metal", "paper", "plastic", "trash"}
    assert 0 <= data["predicted_class_id"] <= 5
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["probabilities"]) == 6
    assert data["guidance"]["bin_name"]
    assert "Guidance only" in data["guidance"]["disclaimer"]
