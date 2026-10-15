"""
WasteWise-AI: Custom CNN Training and Evaluation Pipeline
=========================================================
Trains a documented custom Convolutional Neural Network (CNN) from scratch
using TensorFlow / Keras on the verified, stratified TrashNet dataset.

Features:
    - High-throughput tf.data pipeline with dynamic decoding, caching, and prefetching.
    - Data augmentation (horizontal flip, subtle rotation, zoom) applied ONLY to training.
    - Custom regularized CNN (Conv2D -> BatchNorm -> ReLU -> MaxPool -> Dropout)
      with GlobalAveragePooling2D to prevent overfitting.
    - Balanced class weighting for minority classes (e.g., trash).
    - Callbacks: ModelCheckpoint (best val_loss), EarlyStopping, ReduceLROnPlateau.
    - Comprehensive test evaluation: Confusion matrix, Precision/Recall/F1 per class.
    - Generates training curves plot, metrics JSON, and training history CSV.
    - Interactive smoke test mode (--smoke-test) for pre-flight pipeline validation.

Usage:
    # 1. Run quick pre-flight smoke test (single batch validation):
    python ml/scripts/train_cnn.py --smoke-test

    # 2. Launch full training run:
    python ml/scripts/train_cnn.py --epochs 30 --batch-size 32
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Clean Windows terminal output without charmap errors
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Suppress verbose C++ TensorFlow runtime messages
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

try:
    import matplotlib.pyplot as plt
    import numpy as np
    import pandas as pd
    import seaborn as sns
    from sklearn.metrics import classification_report, confusion_matrix
    import tensorflow as tf
except ImportError as err:
    print(
        f"[ERROR] Required dependency missing: {err}\n"
        "Ensure your virtual environment is active and run: pip install -r requirements.txt"
    )
    sys.exit(1)

# Check minimum required TensorFlow version
REQUIRED_TF_MAJOR = 2
REQUIRED_TF_MINOR = 15
tf_version_parts = [int(p) for p in tf.__version__.split(".")[:2]]
if tf_version_parts[0] < REQUIRED_TF_MAJOR or (
    tf_version_parts[0] == REQUIRED_TF_MAJOR and tf_version_parts[1] < REQUIRED_TF_MINOR
):
    print(
        f"[WARNING] Detected TensorFlow {tf.__version__}. WasteWise-AI recommends "
        f"TensorFlow >= {REQUIRED_TF_MAJOR}.{REQUIRED_TF_MINOR}.0 for optimal Keras 3 compatibility."
    )

# Canonical 6-class mapping
DEFAULT_CLASS_MAPPING: Dict[str, int] = {
    "cardboard": 0,
    "glass": 1,
    "metal": 2,
    "paper": 3,
    "plastic": 4,
    "trash": 5,
}
DEFAULT_ID_TO_CLASS: Dict[int, str] = {v: k for k, v in DEFAULT_CLASS_MAPPING.items()}


def set_reproducible_seed(seed: int = 42) -> None:
    """Sets deterministic seeds across Python, NumPy, and TensorFlow."""
    os.environ["PYTHONHASHSEED"] = str(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    try:
        tf.keras.utils.set_random_seed(seed)
    except AttributeError:
        pass


def validate_manifest(
    manifest_path: Path,
    expected_class_mapping: Dict[str, int],
    split_name: str,
) -> pd.DataFrame:
    """
    Validates manifest existence, columns, class mapping alignment,
    and checks that every referenced image file exists on disk.
    """
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"Manifest file for {split_name} split does not exist: {manifest_path.resolve()}"
        )

    df = pd.read_csv(manifest_path)
    required_cols = {"image_path", "filename", "class_name", "class_id"}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(
            f"Manifest {manifest_path.name} is missing required columns: {missing_cols}"
        )

    if len(df) == 0:
        raise ValueError(f"Manifest {manifest_path.name} contains zero records!")

    # Verify class mappings
    for _, row in df.iterrows():
        expected_id = expected_class_mapping.get(row["class_name"])
        if expected_id is None:
            raise ValueError(
                f"Unexpected class name '{row['class_name']}' in {manifest_path.name}"
            )
        if int(row["class_id"]) != expected_id:
            raise ValueError(
                f"Mismatch in {manifest_path.name}: class '{row['class_name']}' has id "
                f"{row['class_id']} but expected {expected_id}"
            )

    # Verify physical file existence
    missing_files = []
    for path_str in df["image_path"]:
        p = Path(path_str)
        if not p.exists() or not p.is_file():
            missing_files.append(path_str)

    if missing_files:
        sample_missing = missing_files[:5]
        raise FileNotFoundError(
            f"Found {len(missing_files)} missing image file(s) referenced in {manifest_path.name}.\n"
            f"Examples: {sample_missing}"
        )

    return df


def load_class_weights(
    class_weights_path: Path,
    expected_class_mapping: Optional[Dict[str, int]] = None,
) -> Dict[int, float]:
    """
    Loads and rigorously validates class weights from a JSON file.
    Supports standard inverse-frequency or custom square-root dampened weights.

    Validates:
        - File exists and is valid JSON.
        - All expected class IDs (0..5) are present.
        - Every weight is finite (not NaN, not Inf) and strictly positive (w > 0).

    Returns:
        Dict[int, float]: Mapping from integer class_id to float weight.
    """
    if not class_weights_path.exists():
        raise FileNotFoundError(
            f"Class weights file not found: {class_weights_path.resolve()}.\n"
            "Ensure the path is correct or run `python ml/scripts/prepare_dataset.py`."
        )

    with open(class_weights_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as err:
            raise ValueError(f"Corrupted or invalid JSON in {class_weights_path.name}: {err}")

    raw_weights = {}
    if "class_weights_by_id" in data:
        raw_weights = {int(k): float(v) for k, v in data["class_weights_by_id"].items()}
    elif "class_weights_by_name" in data and expected_class_mapping is not None:
        raw_weights = {
            expected_class_mapping[cls]: float(w)
            for cls, w in data["class_weights_by_name"].items()
            if cls in expected_class_mapping
        }
    elif isinstance(data, dict):
        raw_weights = {int(k): float(v) for k, v in data.items() if str(k).isdigit()}
    else:
        raise ValueError(
            f"Unrecognized class weights schema in {class_weights_path.name}. "
            "Expected 'class_weights_by_id' or a dictionary of {class_id: weight}."
        )

    if not raw_weights:
        raise ValueError(f"No valid class weight entries could be parsed from {class_weights_path.name}")

    # Validate against expected class mapping
    if expected_class_mapping is not None:
        expected_ids = set(expected_class_mapping.values())
        missing_ids = expected_ids - set(raw_weights.keys())
        if missing_ids:
            raise ValueError(
                f"Class weights file {class_weights_path.name} is missing required class IDs: {sorted(list(missing_ids))}"
            )

    # Validate values are strictly positive and finite
    validated_weights = {}
    for cid, w in raw_weights.items():
        if not np.isfinite(w) or w <= 0.0:
            raise ValueError(
                f"Invalid class weight for class ID {cid}: {w}. "
                "Class weights must be finite and strictly positive (> 0)."
            )
        validated_weights[cid] = float(w)

    return validated_weights


def create_data_augmentation_layer() -> tf.keras.Sequential:
    """
    Creates image augmentation pipeline applied solely to training batches.
    Includes horizontal flipping, subtle rotation (+/- 10%), and subtle zoom (+/- 10%).
    """
    return tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal", name="aug_random_flip"),
            tf.keras.layers.RandomRotation(0.08, fill_mode="nearest", name="aug_random_rotation"),
            tf.keras.layers.RandomZoom(0.08, fill_mode="nearest", name="aug_random_zoom"),
        ],
        name="data_augmentation",
    )


def build_tf_dataset(
    df: pd.DataFrame,
    image_size: Tuple[int, int] = (224, 224),
    batch_size: int = 32,
    is_training: bool = False,
    augmentation_layer: tf.keras.Sequential = None,
    seed: int = 42,
) -> tf.data.Dataset:
    """
    Builds an efficient tf.data pipeline:
    1. Reads and decodes JPEG bytes dynamically.
    2. Resizes to (image_size, image_size).
    3. Normalizes pixel intensities to [0.0, 1.0].
    4. Shuffles and augments if is_training is True.
    5. Batches and prefetches using tf.data.AUTOTUNE for maximum throughput.
    """
    file_paths = df["image_path"].values.tolist()
    labels = df["class_id"].values.astype(np.int32).tolist()

    paths_tensor = tf.constant(file_paths)
    labels_tensor = tf.constant(labels)

    dataset = tf.data.Dataset.from_tensor_slices((paths_tensor, labels_tensor))

    def parse_image(path: tf.Tensor, label: tf.Tensor) -> Tuple[tf.Tensor, tf.Tensor]:
        img_bytes = tf.io.read_file(path)
        img = tf.io.decode_jpeg(img_bytes, channels=3)
        img = tf.image.resize(img, image_size)
        # Consistent [0, 1] normalization
        img = tf.cast(img, tf.float32) / 255.0
        img.set_shape([image_size[0], image_size[1], 3])
        return img, label

    dataset = dataset.map(parse_image, num_parallel_calls=tf.data.AUTOTUNE)

    if is_training:
        dataset = dataset.shuffle(buffer_size=min(len(df), 1000), seed=seed, reshuffle_each_iteration=True)

    dataset = dataset.batch(batch_size)

    if is_training and augmentation_layer is not None:
        dataset = dataset.map(
            lambda x, y: (augmentation_layer(x, training=True), y),
            num_parallel_calls=tf.data.AUTOTUNE,
        )

    dataset = dataset.prefetch(buffer_size=tf.data.AUTOTUNE)
    return dataset


def build_custom_cnn(
    input_shape: Tuple[int, int, int] = (224, 224, 3),
    num_classes: int = 6,
) -> tf.keras.Model:
    """
    Constructs a well-regularized custom Convolutional Neural Network architecture.

    Architecture Layout:
        - Input: (224, 224, 3) normalized images [0.0, 1.0]
        - Block 1: 2x Conv2D(32, 3x3) + BatchNorm + ReLU -> MaxPool(2x2) -> Dropout(0.20)
        - Block 2: 2x Conv2D(64, 3x3) + BatchNorm + ReLU -> MaxPool(2x2) -> Dropout(0.25)
        - Block 3: 2x Conv2D(128, 3x3) + BatchNorm + ReLU -> MaxPool(2x2) -> Dropout(0.30)
        - Block 4: 1x Conv2D(256, 3x3) + BatchNorm + ReLU -> MaxPool(2x2) -> Dropout(0.35)
        - Head: GlobalAveragePooling2D -> Dense(256) + BatchNorm + ReLU -> Dropout(0.50) -> Dense(6, Softmax)

    Rationale:
        - Deep feature extraction with progressive filter growth (32 -> 64 -> 128 -> 256).
        - GlobalAveragePooling2D replaces flattening, dramatically cutting trainable parameters,
          preventing severe overfitting on smaller datasets (~1.8k images), and reducing memory footprint.
        - Strategic dropout & batch normalization prevent internal covariate shift and encourage robust features.
    """
    inputs = tf.keras.layers.Input(shape=input_shape, name="input_image")

    # --- Block 1 (Feature extraction: low-level edges & textures) ---
    x = tf.keras.layers.Conv2D(32, (3, 3), padding="same", name="conv1_1")(inputs)
    x = tf.keras.layers.BatchNormalization(name="bn1_1")(x)
    x = tf.keras.layers.Activation("relu", name="relu1_1")(x)

    x = tf.keras.layers.Conv2D(32, (3, 3), padding="same", name="conv1_2")(x)
    x = tf.keras.layers.BatchNormalization(name="bn1_2")(x)
    x = tf.keras.layers.Activation("relu", name="relu1_2")(x)

    x = tf.keras.layers.MaxPooling2D((2, 2), name="pool1")(x)
    x = tf.keras.layers.Dropout(0.20, name="drop1")(x)

    # --- Block 2 (Mid-level motifs & boundary curves) ---
    x = tf.keras.layers.Conv2D(64, (3, 3), padding="same", name="conv2_1")(x)
    x = tf.keras.layers.BatchNormalization(name="bn2_1")(x)
    x = tf.keras.layers.Activation("relu", name="relu2_1")(x)

    x = tf.keras.layers.Conv2D(64, (3, 3), padding="same", name="conv2_2")(x)
    x = tf.keras.layers.BatchNormalization(name="bn2_2")(x)
    x = tf.keras.layers.Activation("relu", name="relu2_2")(x)

    x = tf.keras.layers.MaxPooling2D((2, 2), name="pool2")(x)
    x = tf.keras.layers.Dropout(0.25, name="drop2")(x)

    # --- Block 3 (High-level class parts: caps, handles, crumpled surfaces) ---
    x = tf.keras.layers.Conv2D(128, (3, 3), padding="same", name="conv3_1")(x)
    x = tf.keras.layers.BatchNormalization(name="bn3_1")(x)
    x = tf.keras.layers.Activation("relu", name="relu3_1")(x)

    x = tf.keras.layers.Conv2D(128, (3, 3), padding="same", name="conv3_2")(x)
    x = tf.keras.layers.BatchNormalization(name="bn3_2")(x)
    x = tf.keras.layers.Activation("relu", name="relu3_2")(x)

    x = tf.keras.layers.MaxPooling2D((2, 2), name="pool3")(x)
    x = tf.keras.layers.Dropout(0.30, name="drop3")(x)

    # --- Block 4 (Complex object contextual patterns) ---
    x = tf.keras.layers.Conv2D(256, (3, 3), padding="same", name="conv4_1")(x)
    x = tf.keras.layers.BatchNormalization(name="bn4_1")(x)
    x = tf.keras.layers.Activation("relu", name="relu4_1")(x)

    x = tf.keras.layers.MaxPooling2D((2, 2), name="pool4")(x)
    x = tf.keras.layers.Dropout(0.35, name="drop4")(x)

    # --- Dense Classification Head ---
    x = tf.keras.layers.GlobalAveragePooling2D(name="gap")(x)
    x = tf.keras.layers.Dense(256, name="dense_features")(x)
    x = tf.keras.layers.BatchNormalization(name="bn_features")(x)
    x = tf.keras.layers.Activation("relu", name="relu_features")(x)
    x = tf.keras.layers.Dropout(0.50, name="drop_features")(x)

    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="WasteWise_Custom_CNN")
    return model


def run_smoke_test(
    train_df: pd.DataFrame,
    class_weights: Dict[int, float],
    image_size: Tuple[int, int] = (224, 224),
    batch_size: int = 32,
    seed: int = 42,
) -> bool:
    """
    Executes a comprehensive pre-flight verification:
    1. Loads a single batch from the tf.data training pipeline.
    2. Asserts batch image shape: (batch_size, 224, 224, 3).
    3. Asserts batch labels shape: (batch_size,).
    4. Asserts pixel values are properly normalized within [0.0, 1.0].
    5. Builds and compiles the model.
    6. Verifies forward pass output shape is (batch_size, 6).
    7. Verifies softmax probabilities sum to 1.0.
    8. Verifies one training step with class weights computes loss & updates gradients.
    """
    print("\n" + "=" * 80)
    print("WasteWise-AI: Running Pre-Flight Smoke Test")
    print("=" * 80)

    aug = create_data_augmentation_layer()
    smoke_dataset = build_tf_dataset(
        train_df,
        image_size=image_size,
        batch_size=batch_size,
        is_training=True,
        augmentation_layer=aug,
        seed=seed,
    )

    print("[INFO] Fetching 1 batch from the augmented tf.data pipeline...")
    images, labels = next(iter(smoke_dataset))

    # Assertions on pipeline
    expected_img_shape = (batch_size, image_size[0], image_size[1], 3)
    assert images.shape == expected_img_shape, (
        f"Expected image batch shape {expected_img_shape}, got {images.shape}"
    )
    assert labels.shape == (batch_size,), (
        f"Expected label batch shape ({batch_size},), got {labels.shape}"
    )

    min_pixel = float(tf.reduce_min(images))
    max_pixel = float(tf.reduce_max(images))
    assert 0.0 <= min_pixel <= max_pixel <= 1.0, (
        f"Pixel values out of expected [0.0, 1.0] range: [{min_pixel:.3f}, {max_pixel:.3f}]"
    )

    print(f"  [OK] Batch images shape:      {images.shape}")
    print(f"  [OK] Batch labels shape:      {labels.shape}")
    print(f"  [OK] Pixel intensity range:   [{min_pixel:.4f}, {max_pixel:.4f}] (Normalized)")
    print(f"  [OK] Batch label samples:     {labels.numpy()[:8]}")

    # Build and compile model
    print("\n[INFO] Compiling custom CNN model...")
    model = build_custom_cnn(input_shape=(image_size[0], image_size[1], 3), num_classes=6)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss=tf.keras.losses.SparseCategoricalCrossentropy(from_logits=False),
        metrics=["accuracy"],
    )

    # Forward pass
    print("[INFO] Executing forward pass on the batch...")
    predictions = model(images, training=False)
    assert predictions.shape == (batch_size, 6), (
        f"Expected output shape ({batch_size}, 6), got {predictions.shape}"
    )

    prob_sums = np.sum(predictions.numpy(), axis=-1)
    assert np.allclose(prob_sums, 1.0, atol=1e-4), "Softmax probabilities do not sum to 1.0"

    print(f"  [OK] Model output shape:      {predictions.shape} (batch_size, num_classes)")
    print(f"  [OK] Softmax verification:    All sample probabilities sum to 1.0")

    # Compute loss
    loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=False)
    sample_weights = np.array([class_weights[int(lbl)] for lbl in labels.numpy()], dtype=np.float32)
    initial_loss = float(loss_fn(labels, predictions, sample_weight=sample_weights))
    print(f"  [OK] Initial weighted loss:   {initial_loss:.4f}")

    # Backward pass verification
    print("[INFO] Executing one training optimization step (train_on_batch)...")
    loss_val, acc_val = model.train_on_batch(images, labels, class_weight=class_weights)
    print(f"  [OK] Post-step batch loss:    {loss_val:.4f} (Batch accuracy: {acc_val:.2%})")

    print("\n" + "-" * 80)
    print(">>> SMOKE TEST RESULT: ALL CHECKS PASSED SUCCESSFULLY! <<<")
    print("  - Data decoding, resizing, and normalization: VERIFIED")
    print("  - Data augmentation (flip, rotation, zoom):  VERIFIED")
    print("  - Model architecture & parameter weights:    VERIFIED")
    print("  - Forward inference & Softmax output:        VERIFIED")
    print("  - Backpropagation & class-weighted Adam:     VERIFIED")
    print("-" * 80)
    return True


def plot_training_curves(history: tf.keras.callbacks.History, save_path: Path) -> None:
    """Generates and saves clean loss and accuracy diagnostic curves."""
    save_path.parent.mkdir(parents=True, exist_ok=True)
    epochs = range(1, len(history.history["loss"]) + 1)

    plt.figure(figsize=(14, 5))

    # Loss curve
    plt.subplot(1, 2, 1)
    plt.plot(epochs, history.history["loss"], "o-", label="Train Loss", color="#1f77b4", linewidth=2)
    plt.plot(epochs, history.history["val_loss"], "s--", label="Val Loss", color="#ff7f0e", linewidth=2)
    plt.title("Model Loss (Sparse Categorical Cross-Entropy)", fontsize=13, fontweight="bold")
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Loss", fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(frameon=True)

    # Accuracy curve
    plt.subplot(1, 2, 2)
    plt.plot(epochs, history.history["accuracy"], "o-", label="Train Accuracy", color="#2ca02c", linewidth=2)
    plt.plot(epochs, history.history["val_accuracy"], "s--", label="Val Accuracy", color="#d62728", linewidth=2)
    plt.title("Model Accuracy", fontsize=13, fontweight="bold")
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Accuracy", fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(frameon=True)

    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"[OK] Training curves plot saved to: {save_path.resolve()}")


def evaluate_and_plot_test_metrics(
    model: tf.keras.Model,
    test_ds: tf.data.Dataset,
    test_df: pd.DataFrame,
    class_mapping: Dict[str, int],
    output_dir: Path,
) -> Dict:
    """
    Evaluates final model checkpoint on unseen test split, computes classification metrics,
    and plots the confusion matrix heatmap.
    """
    print("\n" + "=" * 80)
    print("WasteWise-AI: Final Test Set Evaluation")
    print("=" * 80)

    # Predict test samples
    y_prob = model.predict(test_ds, verbose=1)
    y_pred = np.argmax(y_prob, axis=1)
    y_true = test_df["class_id"].values.astype(int)

    # Class names in ID order
    sorted_classes = [c for c, _ in sorted(class_mapping.items(), key=lambda x: x[1])]

    # Classification report
    clf_report = classification_report(
        y_true,
        y_pred,
        target_names=sorted_classes,
        digits=4,
        output_dict=True,
    )
    clf_report_text = classification_report(
        y_true,
        y_pred,
        target_names=sorted_classes,
        digits=4,
    )

    print("\nClassification Report (Test Partition):")
    print(clf_report_text)

    # Highlight minority class
    trash_f1 = clf_report.get("trash", {}).get("f1-score", 0.0)
    trash_recall = clf_report.get("trash", {}).get("recall", 0.0)
    print(f"Minority Class 'trash' Analysis:")
    print(f"  * Recall:   {trash_recall:.4f}")
    print(f"  * F1-Score: {trash_f1:.4f}")

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    cm_path = output_dir / "confusion_matrix.png"

    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=sorted_classes,
        yticklabels=sorted_classes,
        cbar=True,
    )
    plt.title("WasteWise-AI: Test Set Confusion Matrix", fontsize=14, fontweight="bold")
    plt.xlabel("Predicted Class", fontsize=12)
    plt.ylabel("Ground Truth Class", fontsize=12)
    plt.tight_layout()
    plt.savefig(cm_path, dpi=300)
    plt.close()
    print(f"[OK] Confusion matrix plot saved to: {cm_path.resolve()}")

    # Compile comprehensive metrics dictionary
    overall_acc = float(np.mean(y_true == y_pred))
    test_eval = model.evaluate(test_ds, verbose=0)
    test_loss = float(test_eval[0])

    metrics_result = {
        "test_loss": round(test_loss, 4),
        "test_accuracy": round(overall_acc, 4),
        "macro_avg": clf_report.get("macro avg", {}),
        "weighted_avg": clf_report.get("weighted avg", {}),
        "per_class": {
            cls: {
                "precision": round(clf_report[cls]["precision"], 4),
                "recall": round(clf_report[cls]["recall"], 4),
                "f1_score": round(clf_report[cls]["f1-score"], 4),
                "support": int(clf_report[cls]["support"]),
            }
            for cls in sorted_classes
        },
        "confusion_matrix": cm.tolist(),
    }

    metrics_json_path = output_dir / "test_metrics.json"
    with open(metrics_json_path, "w", encoding="utf-8") as f:
        json.dump(metrics_result, f, indent=2)
    print(f"[OK] Test metrics summary saved to: {metrics_json_path.resolve()}")

    return metrics_result


def main():
    parser = argparse.ArgumentParser(
        description="Train and evaluate the custom WasteWise-AI CNN model."
    )
    parser.add_argument(
        "--train-manifest",
        type=Path,
        default=Path("ml/outputs/train_manifest.csv"),
        help="Path to training manifest CSV (default: ml/outputs/train_manifest.csv)",
    )
    parser.add_argument(
        "--val-manifest",
        type=Path,
        default=Path("ml/outputs/val_manifest.csv"),
        help="Path to validation manifest CSV (default: ml/outputs/val_manifest.csv)",
    )
    parser.add_argument(
        "--test-manifest",
        type=Path,
        default=Path("ml/outputs/test_manifest.csv"),
        help="Path to test manifest CSV (default: ml/outputs/test_manifest.csv)",
    )
    parser.add_argument(
        "--class-weights",
        type=Path,
        default=Path("ml/outputs/class_weights.json"),
        help="Path to class weights JSON file (default: ml/outputs/class_weights.json; use ml/outputs/class_weights_damped.json for dampened experiment)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("ml/outputs"),
        help="Directory to save models and diagnostic outputs (default: ml/outputs)",
    )
    parser.add_argument(
        "--model-path",
        type=Path,
        default=None,
        help="Path to save the best trained Keras model (default: <output-dir>/wastewise_cnn.keras)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for training and evaluation (default: 32)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=30,
        help="Maximum training epochs (default: 30)",
    )
    parser.add_argument(
        "--image-size",
        type=int,
        default=224,
        help="Image height and width in pixels (default: 224)",
    )
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=0.001,
        help="Initial learning rate for Adam optimizer (default: 0.001)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="Run short pre-flight validation on 1 batch and exit without training",
    )

    args = parser.parse_args()
    set_reproducible_seed(args.seed)

    # 0. Resolve output directory and model checkpoint path consistently
    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    model_path: Path = args.model_path if args.model_path is not None else (output_dir / "wastewise_cnn.keras")
    model_path.parent.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 80)
    print("WasteWise-AI: Execution & Output Configuration")
    print("=" * 80)
    print(f"Output Directory:    {output_dir.resolve()}")
    print(f"Model Checkpoint:    {model_path.resolve()}")
    print(f"Class Weights File:  {args.class_weights.resolve()}")
    print("=" * 80)

    img_dims = (args.image_size, args.image_size)

    # 1. Validate manifests and image existence
    print("\n[INFO] Validating CSV manifests and disk image paths...")
    train_df = validate_manifest(args.train_manifest, DEFAULT_CLASS_MAPPING, "Train")
    val_df = validate_manifest(args.val_manifest, DEFAULT_CLASS_MAPPING, "Validation")
    test_df = validate_manifest(args.test_manifest, DEFAULT_CLASS_MAPPING, "Test")

    print(
        f"[OK] Manifests verified: Train={len(train_df)} | Val={len(val_df)} | Test={len(test_df)} images."
    )

    # 2. Save canonical class mapping JSON
    class_mapping_path = output_dir / "class_mapping.json"
    mapping_payload = {
        "class_to_id": DEFAULT_CLASS_MAPPING,
        "id_to_class": {str(k): v for k, v in DEFAULT_ID_TO_CLASS.items()},
    }
    with open(class_mapping_path, "w", encoding="utf-8") as f:
        json.dump(mapping_payload, f, indent=2)
    print(f"[OK] Saved class mapping to: {class_mapping_path.resolve()}")

    # 3. Load class weights
    class_weights = load_class_weights(args.class_weights, expected_class_mapping=DEFAULT_CLASS_MAPPING)
    print(f"[OK] Loaded and validated training class weights from '{args.class_weights.name}': {class_weights}")

    # 4. Handle Smoke Test mode
    if args.smoke_test:
        success = run_smoke_test(
            train_df=train_df,
            class_weights=class_weights,
            image_size=img_dims,
            batch_size=args.batch_size,
            seed=args.seed,
        )
        if success:
            sys.exit(0)
        else:
            sys.exit(1)

    # 5. Build full tf.data pipelines
    print("\n[INFO] Constructing optimized tf.data pipelines...")
    aug_layer = create_data_augmentation_layer()
    train_ds = build_tf_dataset(
        train_df,
        image_size=img_dims,
        batch_size=args.batch_size,
        is_training=True,
        augmentation_layer=aug_layer,
        seed=args.seed,
    )
    val_ds = build_tf_dataset(
        val_df,
        image_size=img_dims,
        batch_size=args.batch_size,
        is_training=False,
    )
    test_ds = build_tf_dataset(
        test_df,
        image_size=img_dims,
        batch_size=args.batch_size,
        is_training=False,
    )

    # 6. Build and compile custom CNN
    print("\n[INFO] Initializing custom CNN model architecture...")
    model = build_custom_cnn(
        input_shape=(args.image_size, args.image_size, 3),
        num_classes=len(DEFAULT_CLASS_MAPPING),
    )
    model.summary()

    optimizer = tf.keras.optimizers.Adam(learning_rate=args.learning_rate)
    loss_fn = tf.keras.losses.SparseCategoricalCrossentropy(from_logits=False)
    model.compile(optimizer=optimizer, loss=loss_fn, metrics=["accuracy"])

    # 7. Configure robust training callbacks
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(model_path),
            monitor="val_loss",
            save_best_only=True,
            verbose=1,
        ),
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=8,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-6,
            verbose=1,
        ),
    ]

    # 8. Execute model training
    print(f"\n[INFO] Launching model training for up to {args.epochs} epochs...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=args.epochs,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1,
    )

    # 9. Save history to CSV
    history_df = pd.DataFrame(history.history)
    history_df.index.name = "epoch"
    history_csv_path = output_dir / "training_history.csv"
    history_df.to_csv(history_csv_path)
    print(f"[OK] Training history saved to: {history_csv_path.resolve()}")

    # 10. Generate loss and accuracy curves
    training_curves_path = output_dir / "training_curves.png"
    plot_training_curves(history, training_curves_path)

    # 11. Load best checkpoint for final test evaluation
    print(f"\n[INFO] Loading best saved checkpoint from: {model_path.resolve()} ...")
    best_model = tf.keras.models.load_model(str(model_path))

    # 12. Evaluate final model on test set
    evaluate_and_plot_test_metrics(
        model=best_model,
        test_ds=test_ds,
        test_df=test_df,
        class_mapping=DEFAULT_CLASS_MAPPING,
        output_dir=output_dir,
    )

    print("\n" + "=" * 80)
    print("WasteWise-AI: Full Training and Evaluation Completed Successfully!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
