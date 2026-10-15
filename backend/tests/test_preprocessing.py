"""
WasteWise-AI: Preprocessing Unit Tests
======================================
Tests image decoding, color conversion, resizing, and float32 normalization
to ensure exact alignment with the CNN training pipeline.
"""

import io
import numpy as np
import pytest
from PIL import Image

from backend.services.model_service import preprocess_image


def create_test_image_bytes(
    size=(300, 200),
    mode="RGB",
    fmt="JPEG",
    color=(128, 64, 32),
) -> bytes:
    """Helper creating in-memory synthetic image bytes."""
    img = Image.new(mode, size, color=color)
    buffer = io.BytesIO()
    img.save(buffer, format=fmt)
    return buffer.getvalue()


def test_preprocess_valid_rgb_jpeg():
    """Verifies standard RGB JPEG decoding, resize to 224x224, and [0, 1] normalization."""
    img_bytes = create_test_image_bytes(size=(400, 300), mode="RGB", fmt="JPEG", color=(255, 128, 0))
    batch = preprocess_image(img_bytes, target_size=(224, 224))

    assert isinstance(batch, np.ndarray), "Output must be a NumPy ndarray"
    assert batch.shape == (1, 224, 224, 3), f"Expected shape (1, 224, 224, 3), got {batch.shape}"
    assert batch.dtype == np.float32, f"Expected float32 dtype, got {batch.dtype}"
    assert batch.min() >= 0.0, "Normalized pixel values must be >= 0.0"
    assert batch.max() <= 1.0, "Normalized pixel values must be <= 1.0"


def test_preprocess_rgba_png_converts_to_rgb():
    """Verifies RGBA 4-channel image is safely converted to 3-channel RGB."""
    img_bytes = create_test_image_bytes(size=(200, 200), mode="RGBA", fmt="PNG", color=(50, 100, 150, 255))
    batch = preprocess_image(img_bytes, target_size=(224, 224))

    assert batch.shape == (1, 224, 224, 3)
    assert batch.dtype == np.float32


def test_preprocess_grayscale_converts_to_rgb():
    """Verifies single-channel Grayscale image is converted to 3-channel RGB."""
    img_bytes = create_test_image_bytes(size=(150, 150), mode="L", fmt="PNG", color=128)
    batch = preprocess_image(img_bytes, target_size=(224, 224))

    assert batch.shape == (1, 224, 224, 3)
    assert batch.dtype == np.float32


def test_preprocess_empty_bytes_raises_error():
    """Verifies that empty byte buffer raises ValueError."""
    with pytest.raises(ValueError, match="Image file is empty"):
        preprocess_image(b"")


def test_preprocess_corrupted_bytes_raises_error():
    """Verifies that non-image corrupted bytes raise ValueError."""
    with pytest.raises(ValueError, match="Invalid or corrupted image format"):
        preprocess_image(b"not_a_valid_image_header_bytes_1234567890")
