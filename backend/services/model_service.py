"""
WasteWise-AI: Machine Learning Model & Preprocessing Service
===========================================================
Encapsulates CNN model lifecycle, preprocessing matching the training pipeline,
and forward-pass inference.
"""

import io
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageOps

from backend.app.config import settings
from backend.app.schemas import ClassProbability, PredictionResponse
from backend.services.recycling_service import get_recycling_guidance

logger = logging.getLogger("wastewise.model_service")

# Default canonical class mapping fallback if JSON artifact is absent
FALLBACK_ID_TO_CLASS: Dict[int, str] = {
    0: "cardboard",
    1: "glass",
    2: "metal",
    3: "paper",
    4: "plastic",
    5: "trash",
}


def preprocess_image(
    image_bytes: bytes,
    target_size: Tuple[int, int] = (224, 224),
) -> np.ndarray:
    """
    Validates and preprocesses raw image bytes strictly matching the training pipeline:
    1. Validates non-empty byte buffer.
    2. Decodes image pixels via PIL and verifies file integrity.
    3. Corrects EXIF camera orientation if present.
    4. Converts color space to RGB (handles RGBA, Grayscale, CMYK, Palette).
    5. Resizes to target dimensions (224 x 224) using bilinear interpolation.
    6. Converts to float32 NumPy array and normalizes pixel values to [0.0, 1.0].
    7. Adds batch dimension: shape (1, 224, 224, 3).

    Args:
        image_bytes: Raw binary bytes of uploaded image.
        target_size: Expected (width, height) dimensions. Default (224, 224).

    Returns:
        np.ndarray: Preprocessed 4D batch array of shape (1, target_size[0], target_size[1], 3).

    Raises:
        ValueError: If the byte buffer is empty or corrupted/unsupported.
    """
    if not image_bytes:
        raise ValueError("Image file is empty (0 bytes). Please upload a valid image.")

    try:
        image_stream = io.BytesIO(image_bytes)
        image = Image.open(image_stream)
        # Force pixel decoding into memory to verify integrity and detect corruption
        image.load()
    except Exception as exc:
        raise ValueError(f"Invalid or corrupted image format: {exc}") from exc

    # Honor camera EXIF orientation tag if present
    try:
        image = ImageOps.exif_transpose(image)
    except Exception:
        pass

    # Ensure 3-channel RGB color space
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Resize using bilinear interpolation (consistent with tf.image.resize)
    if image.size != target_size:
        image = image.resize(target_size, Image.Resampling.BILINEAR)

    # Cast to float32 and normalize to [0.0, 1.0] matching training pipeline
    img_array = np.asarray(image, dtype=np.float32) / 255.0

    # Expand batch dimension -> (1, 224, 224, 3)
    batch_array = np.expand_dims(img_array, axis=0)
    return batch_array


class ModelService:
    """Singleton service managing CNN model inference and lifecycle."""

    def __init__(self) -> None:
        self.model: Optional[Any] = None
        self.class_mapping: Dict[str, int] = {}
        self.id_to_class: Dict[int, str] = FALLBACK_ID_TO_CLASS.copy()
        self._loaded_model_path: Optional[str] = None

    def is_loaded(self) -> bool:
        """Checks if the Keras model is loaded into memory."""
        return self.model is not None

    def load_model(
        self,
        model_path: Optional[Path] = None,
        mapping_path: Optional[Path] = None,
    ) -> None:
        """
        Loads the trained Keras CNN model once at application startup.
        Also loads class mapping metadata.

        Args:
            model_path: Optional custom path to model artifact.
            mapping_path: Optional custom path to class mapping JSON.
        """
        resolved_model_path = settings.resolve_path(model_path or settings.MODEL_PATH)
        resolved_mapping_path = settings.resolve_path(
            mapping_path or settings.CLASS_MAPPING_PATH
        )

        logger.info("Loading WasteWise CNN model from: %s", resolved_model_path)

        if not resolved_model_path.exists():
            raise FileNotFoundError(
                f"Model file not found at: {resolved_model_path}. "
                "Verify model path or ensure the trained artifact is present."
            )

        # Load class mapping if available
        if resolved_mapping_path.exists():
            try:
                with open(resolved_mapping_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "id_to_class" in data:
                        self.id_to_class = {int(k): v for k, v in data["id_to_class"].items()}
                    if "class_to_id" in data:
                        self.class_mapping = data["class_to_id"]
                logger.info("Loaded class mapping: %s", self.id_to_class)
            except Exception as err:
                logger.warning(
                    "Could not parse class mapping at %s: %s. Using default mapping.",
                    resolved_mapping_path,
                    err,
                )

        # Lazy import of tensorflow to prevent unnecessary overhead in lightweight contexts
        import tensorflow as tf

        try:
            self.model = tf.keras.models.load_model(str(resolved_model_path))
            self._loaded_model_path = str(resolved_model_path)
            logger.info(
                "Model successfully loaded. Input: %s, Output: %s",
                getattr(self.model, "input_shape", "unknown"),
                getattr(self.model, "output_shape", "unknown"),
            )
        except Exception as err:
            self.model = None
            self._loaded_model_path = None
            raise RuntimeError(f"Failed to load Keras model from {resolved_model_path}: {err}") from err

    def predict(
        self,
        image_bytes: bytes,
        filename: Optional[str] = None,
    ) -> PredictionResponse:
        """
        Executes end-to-end inference for a single image:
        1. Preprocesses image bytes.
        2. Executes forward pass through CNN model.
        3. Computes class probabilities and top prediction.
        4. Attaches structured recycling guidance and disclaimer.

        Args:
            image_bytes: Raw binary image payload.
            filename: Optional source filename for tracking.

        Returns:
            PredictionResponse: Complete structured response.

        Raises:
            RuntimeError: If model is not loaded.
            ValueError: If preprocessing fails due to invalid image bytes.
        """
        if not self.is_loaded():
            raise RuntimeError(
                "Inference model is not loaded. Ensure startup model loading succeeded."
            )

        # Preprocess input image
        preprocessed_batch = preprocess_image(
            image_bytes, target_size=settings.IMAGE_SIZE
        )

        # Run forward pass (training=False ensures deterministic Dropout/BatchNorm evaluation)
        try:
            raw_predictions = self.model(preprocessed_batch, training=False)
            if hasattr(raw_predictions, "numpy"):
                probabilities_array = raw_predictions.numpy()[0]
            else:
                probabilities_array = np.array(raw_predictions)[0]
        except Exception as exc:
            logger.error("Inference execution failure: %s", exc, exc_info=True)
            raise RuntimeError(f"Error during neural network forward pass: {exc}") from exc

        # Identify predicted class
        predicted_class_id = int(np.argmax(probabilities_array))
        confidence_score = float(probabilities_array[predicted_class_id])
        predicted_class_name = self.id_to_class.get(
            predicted_class_id, f"class_{predicted_class_id}"
        )

        # Build list of all class probabilities
        probabilities: List[ClassProbability] = [
            ClassProbability(
                class_id=cid,
                class_name=self.id_to_class.get(cid, f"class_{cid}"),
                probability=round(float(probabilities_array[cid]), 6),
            )
            for cid in range(len(probabilities_array))
        ]

        # Retrieve recycling guidance
        guidance = get_recycling_guidance(predicted_class_name)

        return PredictionResponse(
            predicted_class=predicted_class_name,
            predicted_class_id=predicted_class_id,
            confidence=round(confidence_score, 6),
            probabilities=probabilities,
            guidance=guidance,
            filename=filename,
        )


# Global singleton instance
model_service = ModelService()
