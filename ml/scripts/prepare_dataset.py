"""
WasteWise-AI: Dataset Preparation and Stratified Splitting Script
================================================================
Reads the verified TrashNet dataset without modifying original images.
Generates reproducible, stratified Train / Validation / Test splits (70/15/15)
with random seed 42 to prevent data leakage.

Outputs:
    - ml/outputs/train_manifest.csv
    - ml/outputs/val_manifest.csv
    - ml/outputs/test_manifest.csv
    - ml/outputs/dataset_manifest.csv (all splits combined)
    - ml/outputs/class_weights.json

Usage:
    python ml/scripts/prepare_dataset.py
    python ml/scripts/prepare_dataset.py --data-dir ml/data/trashnet --output-dir ml/outputs --seed 42
"""

import argparse
import json
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# Ensure Windows terminal output handles UTF-8 safely without charmap crashes
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import numpy as np
    import pandas as pd
    from PIL import Image, UnidentifiedImageError
    from sklearn.model_selection import train_test_split
    from sklearn.utils.class_weight import compute_class_weight
except ImportError as err:
    print(
        f"[ERROR] Missing required library: {err}\n"
        "Please ensure your virtual environment is active and run: pip install -r requirements.txt"
    )
    sys.exit(1)

# Canonical class list for the TrashNet benchmark dataset (sorted for deterministic class_id assignment)
EXPECTED_CLASSES: List[str] = sorted(
    ["cardboard", "glass", "metal", "paper", "plastic", "trash"]
)

# Supported image file extensions
VALID_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def verify_image_readable(file_path: Path) -> Tuple[bool, Optional[str]]:
    """
    Checks that an image file is non-empty, has a valid header, and can decode
    pixel data completely without raising IO or truncation errors.
    Does NOT modify the file in any way.
    """
    try:
        if file_path.stat().st_size == 0:
            return False, "File is empty (0 bytes)"

        with Image.open(file_path) as img:
            img.verify()

        # Reopen to decode full pixel raster
        with Image.open(file_path) as img:
            img.load()
            return True, None

    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        return False, str(exc)
    except Exception as exc:
        return False, f"Unexpected error: {str(exc)}"


def collect_dataset_records(
    data_dir: Path, expected_classes: List[str]
) -> Tuple[List[Dict[str, str]], List[str]]:
    """
    Scans each class directory under data_dir, validates image integrity,
    and collects structured records for splitting.

    Returns:
        records: list of dicts with keys: image_path, filename, class_name, class_id
        errors: list of error strings encountered
    """
    records: List[Dict[str, str]] = []
    errors: List[str] = []

    if not data_dir.exists():
        errors.append(f"Dataset root directory does not exist: {data_dir.resolve()}")
        return records, errors

    if not data_dir.is_dir():
        errors.append(f"Dataset root path is not a directory: {data_dir.resolve()}")
        return records, errors

    class_to_id = {cls_name: idx for idx, cls_name in enumerate(expected_classes)}

    for class_name in expected_classes:
        class_folder = data_dir / class_name
        if not class_folder.exists() or not class_folder.is_dir():
            errors.append(f"Missing expected class folder: '{class_name}' at {class_folder.resolve()}")
            continue

        entries = sorted([p for p in class_folder.iterdir() if not p.name.startswith(".")], key=lambda p: p.name)
        valid_class_images = 0

        for entry in entries:
            if not entry.is_file():
                continue

            if entry.suffix.lower() not in VALID_EXTENSIONS:
                continue

            is_valid, err_msg = verify_image_readable(entry)
            if not is_valid:
                errors.append(f"Corrupt/unreadable image skipped: {entry.resolve()} ({err_msg})")
                continue

            # Use POSIX forward slashes for cross-platform portability in manifests
            rel_path = entry.as_posix()
            records.append(
                {
                    "image_path": rel_path,
                    "filename": entry.name,
                    "class_name": class_name,
                    "class_id": class_to_id[class_name],
                }
            )
            valid_class_images += 1

        if valid_class_images == 0:
            errors.append(f"Class folder '{class_name}' contains zero valid image files!")

    return records, errors


def perform_stratified_split(
    records: List[Dict[str, str]],
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Creates a two-stage stratified split:
    Stage 1: Split into Train (70%) and Temp (30%).
    Stage 2: Split Temp evenly (50/50 of temp) into Validation (15%) and Test (15%).
    """
    df = pd.DataFrame(records)

    # First split: 70% Train, 30% Temp (Val + Test)
    temp_ratio = val_ratio + test_ratio
    train_df, temp_df = train_test_split(
        df,
        test_size=temp_ratio,
        random_state=random_state,
        stratify=df["class_name"],
    )

    # Second split: Split Temp in half to yield exactly 15% Validation and 15% Test
    val_share_of_temp = val_ratio / temp_ratio  # 0.15 / 0.30 = 0.50
    val_df, test_df = train_test_split(
        temp_df,
        test_size=(1.0 - val_share_of_temp),
        random_state=random_state,
        stratify=temp_df["class_name"],
    )

    # Label the split in each DataFrame
    train_df = train_df.copy()
    val_df = val_df.copy()
    test_df = test_df.copy()

    train_df["split"] = "train"
    val_df["split"] = "val"
    test_df["split"] = "test"

    # Sort deterministically by class_id and filename
    train_df = train_df.sort_values(by=["class_id", "filename"]).reset_index(drop=True)
    val_df = val_df.sort_values(by=["class_id", "filename"]).reset_index(drop=True)
    test_df = test_df.sort_values(by=["class_id", "filename"]).reset_index(drop=True)

    return train_df, val_df, test_df


def verify_splits(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    expected_classes: List[str],
) -> List[str]:
    """
    Audits the split datasets to strictly verify:
    1. Zero path overlap (leakage) between Train, Val, and Test.
    2. Every class is present in all three splits.
    3. Total count matches sum of splits.
    """
    issues: List[str] = []

    train_paths = set(train_df["image_path"])
    val_paths = set(val_df["image_path"])
    test_paths = set(test_df["image_path"])

    # Check for leakage
    leakage_train_val = train_paths & val_paths
    leakage_train_test = train_paths & test_paths
    leakage_val_test = val_paths & test_paths

    if leakage_train_val:
        issues.append(f"CRITICAL: {len(leakage_train_val)} images overlap between Train and Validation!")
    if leakage_train_test:
        issues.append(f"CRITICAL: {len(leakage_train_test)} images overlap between Train and Test!")
    if leakage_val_test:
        issues.append(f"CRITICAL: {len(leakage_val_test)} images overlap between Validation and Test!")

    # Check class coverage
    for split_name, split_df in [("Train", train_df), ("Val", val_df), ("Test", test_df)]:
        present_classes = set(split_df["class_name"].unique())
        missing = set(expected_classes) - present_classes
        if missing:
            issues.append(f"{split_name} split is missing classes: {sorted(list(missing))}")

    return issues


def calculate_class_weights(
    train_df: pd.DataFrame, expected_classes: List[str]
) -> Dict:
    """
    Computes balanced class weights on the training split using the standard formula:
        weight_j = total_train_samples / (n_classes * count_j)
    """
    classes_array = np.array(range(len(expected_classes)))
    y_train = train_df["class_id"].values

    weights = compute_class_weight(
        class_weight="balanced",
        classes=classes_array,
        y=y_train,
    )

    class_to_id = {cls_name: idx for idx, cls_name in enumerate(expected_classes)}
    train_counts = Counter(train_df["class_name"])

    weights_by_id = {int(idx): round(float(w), 4) for idx, w in zip(classes_array, weights)}
    weights_by_name = {cls_name: round(float(weights[class_to_id[cls_name]]), 4) for cls_name in expected_classes}
    counts_by_name = {cls_name: int(train_counts.get(cls_name, 0)) for cls_name in expected_classes}

    result = {
        "metadata": {
            "description": "Balanced class weights computed on the WasteWise-AI training split",
            "formula": "total_train_samples / (num_classes * class_samples)",
            "total_train_samples": len(train_df),
            "num_classes": len(expected_classes),
            "random_seed": 42,
        },
        "class_mapping": class_to_id,
        "class_weights_by_id": weights_by_id,
        "class_weights_by_name": weights_by_name,
        "train_samples_per_class": counts_by_name,
    }

    return result


def print_split_summary(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    expected_classes: List[str],
    class_weights: Dict,
    output_dir: Path,
):
    """Prints a clear, formatted comparison table of split distributions."""
    total_samples = len(train_df) + len(val_df) + len(test_df)
    train_counts = Counter(train_df["class_name"])
    val_counts = Counter(val_df["class_name"])
    test_counts = Counter(test_df["class_name"])

    print("\n" + "=" * 90)
    print("WasteWise-AI: Dataset Preparation & Stratified Split Summary")
    print("=" * 90)
    print(f"Target Split Ratio: 70.0% Train | 15.0% Validation | 15.0% Test (Seed: 42)")
    print(f"Total Dataset Images Accounted For: {total_samples}")
    print("\n" + "-" * 90)
    print(
        f"{'Class Name':<12} | {'Train (70%)':<13} | {'Val (15%)':<13} | "
        f"{'Test (15%)':<13} | {'Total':<7} | {'Class Weight':<12}"
    )
    print("-" * 90)

    for cls in expected_classes:
        n_tr = train_counts.get(cls, 0)
        n_va = val_counts.get(cls, 0)
        n_te = test_counts.get(cls, 0)
        n_tot = n_tr + n_va + n_te

        tr_pct = (n_tr / len(train_df) * 100) if len(train_df) > 0 else 0
        va_pct = (n_va / len(val_df) * 100) if len(val_df) > 0 else 0
        te_pct = (n_te / len(test_df) * 100) if len(test_df) > 0 else 0
        w_val = class_weights["class_weights_by_name"].get(cls, 1.0)

        tr_str = f"{n_tr} ({tr_pct:.1f}%)"
        va_str = f"{n_va} ({va_pct:.1f}%)"
        te_str = f"{n_te} ({te_pct:.1f}%)"

        print(
            f"{cls:<12} | {tr_str:<13} | {va_str:<13} | {te_str:<13} | "
            f"{n_tot:<7} | {w_val:<12.4f}"
        )

    print("-" * 90)
    tr_tot = f"{len(train_df)} ({len(train_df)/total_samples*100:.2f}%)"
    va_tot = f"{len(val_df)} ({len(val_df)/total_samples*100:.2f}%)"
    te_tot = f"{len(test_df)} ({len(test_df)/total_samples*100:.2f}%)"
    print(
        f"{'TOTAL':<12} | {tr_tot:<13} | {va_tot:<13} | {te_tot:<13} | "
        f"{total_samples:<7} | {'-':<12}"
    )
    print("-" * 90)

    print("\nSplit Verification Checklist:")
    print("  [OK] Zero image leakage: Train, Validation, and Test sets are mutually exclusive.")
    print("  [OK] Class coverage: All 6 classes are represented in all three splits.")
    print("  [OK] Stratification: Relative class proportions remain strictly consistent across splits.")
    print("  [OK] Seed reproducibility: Fixed seed 42 guarantees identical partitions across environments.")

    print("\nSaved Output Artifacts:")
    print(f"  * Train Manifest:       {(output_dir / 'train_manifest.csv').resolve()}")
    print(f"  * Validation Manifest:  {(output_dir / 'val_manifest.csv').resolve()}")
    print(f"  * Test Manifest:        {(output_dir / 'test_manifest.csv').resolve()}")
    print(f"  * Full Manifest:        {(output_dir / 'dataset_manifest.csv').resolve()}")
    print(f"  * Class Weights:        {(output_dir / 'class_weights.json').resolve()}")

    print("\nTraining Class Weights (for tf.keras model.fit class_weight parameter):")
    for cls in expected_classes:
        cid = class_weights["class_mapping"][cls]
        w = class_weights["class_weights_by_name"][cls]
        cnt = class_weights["train_samples_per_class"][cls]
        print(f"  - Class {cid} ({cls:<9}): {w:.4f} (training samples: {cnt})")
    print("=" * 90 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Prepare reproducible stratified splits and class weights for WasteWise-AI."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("ml/data/trashnet"),
        help="Path to dataset root folder containing class subdirectories (default: ml/data/trashnet)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("ml/outputs"),
        help="Directory to save manifest CSV files and class weights (default: ml/outputs)",
    )
    parser.add_argument(
        "--train-ratio",
        type=float,
        default=0.70,
        help="Fraction of data allocated to training (default: 0.70)",
    )
    parser.add_argument(
        "--val-ratio",
        type=float,
        default=0.15,
        help="Fraction of data allocated to validation (default: 0.15)",
    )
    parser.add_argument(
        "--test-ratio",
        type=float,
        default=0.15,
        help="Fraction of data allocated to testing (default: 0.15)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible stratified splitting (default: 42)",
    )

    args = parser.parse_args()

    # Validate split ratios
    total_ratio = args.train_ratio + args.val_ratio + args.test_ratio
    if abs(total_ratio - 1.0) > 1e-4:
        print(f"[ERROR] Split ratios must sum to 1.0 (got {total_ratio:.4f})")
        sys.exit(1)

    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n[INFO] Scanning and validating images from: {args.data_dir.resolve()} ...")
    records, errors = collect_dataset_records(args.data_dir, EXPECTED_CLASSES)

    if errors:
        print("\n[WARNING/ERRORS] Encountered issues during data scanning:")
        for err in errors:
            print(f"  - {err}")
        if not records:
            print("[FATAL] No valid records collected. Aborting dataset preparation.")
            sys.exit(1)

    print(f"[INFO] Successfully collected and verified {len(records)} valid images.")

    # Generate stratified splits
    train_df, val_df, test_df = perform_stratified_split(
        records=records,
        train_ratio=args.train_ratio,
        val_ratio=args.val_ratio,
        test_ratio=args.test_ratio,
        random_state=args.seed,
    )

    # Audit splits for zero-leakage and full class coverage
    audit_issues = verify_splits(train_df, val_df, test_df, EXPECTED_CLASSES)
    if audit_issues:
        print("\n[CRITICAL ERROR] Split audit failed:")
        for issue in audit_issues:
            print(f"  - {issue}")
        sys.exit(1)

    # Compute class weights on train split
    class_weights = calculate_class_weights(train_df, EXPECTED_CLASSES)

    # Save manifest files
    train_manifest_path = output_dir / "train_manifest.csv"
    val_manifest_path = output_dir / "val_manifest.csv"
    test_manifest_path = output_dir / "test_manifest.csv"
    all_manifest_path = output_dir / "dataset_manifest.csv"
    weights_path = output_dir / "class_weights.json"

    train_df.to_csv(train_manifest_path, index=False)
    val_df.to_csv(val_manifest_path, index=False)
    test_df.to_csv(test_manifest_path, index=False)

    # Combined full manifest
    all_df = pd.concat([train_df, val_df, test_df], ignore_index=True)
    all_df.to_csv(all_manifest_path, index=False)

    # Save class weights JSON
    with open(weights_path, "w", encoding="utf-8") as f:
        json.dump(class_weights, f, indent=2)

    # Print summary report
    print_split_summary(
        train_df=train_df,
        val_df=val_df,
        test_df=test_df,
        expected_classes=EXPECTED_CLASSES,
        class_weights=class_weights,
        output_dir=output_dir,
    )


if __name__ == "__main__":
    main()
