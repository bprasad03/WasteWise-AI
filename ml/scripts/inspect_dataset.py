"""
WasteWise-AI: Dataset Inspection and Quality Verification Script
================================================================
Inspects image datasets (e.g., TrashNet) to verify directory structure,
validate image integrity, detect corrupted files, compute dimensional
statistics, and summarize class distribution for Deep Learning workflows.

Usage:
    python ml/scripts/inspect_dataset.py
    python ml/scripts/inspect_dataset.py --data-dir ml/data/trashnet --output-csv ml/outputs/dataset_summary.csv
"""

import argparse
import csv
import os
import sys
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Ensure Windows terminal handles UTF-8 gracefully without character map errors
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:
    print(
        "Error: Pillow (PIL) is not installed. Please run `pip install Pillow` "
        "inside your activated virtual environment."
    )
    sys.exit(1)

# Default expected classes for the TrashNet benchmark dataset
DEFAULT_CLASSES: List[str] = [
    "cardboard",
    "glass",
    "metal",
    "paper",
    "plastic",
    "trash",
]

# Supported image file extensions
VALID_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff", ".tif"}


class ClassStats:
    """Holds validation and dimensional statistics for a single class folder."""

    def __init__(self, class_name: str, folder_path: Path):
        self.class_name = class_name
        self.folder_path = folder_path
        self.folder_exists: bool = folder_path.is_dir()
        self.total_files: int = 0
        self.valid_images: int = 0
        self.corrupted_images: int = 0
        self.unsupported_files: int = 0
        self.dimensions: List[Tuple[int, int]] = []
        self.color_modes: Counter = Counter()
        self.image_formats: Counter = Counter()
        self.corrupted_file_list: List[Tuple[str, str]] = []
        self.unsupported_file_list: List[str] = []

    def record_valid_image(self, width: int, height: int, mode: str, img_format: str):
        self.valid_images += 1
        self.dimensions.append((width, height))
        self.color_modes[mode] += 1
        if img_format:
            self.image_formats[img_format] += 1

    def record_corrupted(self, filename: str, error_msg: str):
        self.corrupted_images += 1
        self.corrupted_file_list.append((filename, error_msg))

    def record_unsupported(self, filename: str):
        self.unsupported_files += 1
        self.unsupported_file_list.append(filename)

    @property
    def most_common_dimension(self) -> str:
        if not self.dimensions:
            return "N/A"
        counts = Counter(self.dimensions)
        (common_w, common_h), freq = counts.most_common(1)[0]
        return f"{common_w}x{common_h} ({freq}/{len(self.dimensions)})"

    @property
    def min_dimension(self) -> str:
        if not self.dimensions:
            return "N/A"
        min_w = min(w for w, h in self.dimensions)
        min_h = min(h for w, h in self.dimensions)
        return f"{min_w}x{min_h}"

    @property
    def max_dimension(self) -> str:
        if not self.dimensions:
            return "N/A"
        max_w = max(w for w, h in self.dimensions)
        max_h = max(h for w, h in self.dimensions)
        return f"{max_w}x{max_h}"


def verify_image(file_path: Path) -> Tuple[bool, Optional[Tuple[int, int]], Optional[str], Optional[str], Optional[str]]:
    """
    Safely verifies image integrity by opening and decoding pixel data.
    Does NOT modify or save any images.

    Returns:
        (is_valid, (width, height), mode, format, error_message)
    """
    try:
        # First verification check: structure & header
        with Image.open(file_path) as img:
            img.verify()

        # Reopen to fully decode pixel data (verify() closes file handle in Pillow)
        with Image.open(file_path) as img:
            img.load()  # Catches truncated or damaged byte streams
            width, height = img.size
            mode = img.mode
            img_format = img.format or file_path.suffix.lstrip(".").upper()
            return True, (width, height), mode, img_format, None

    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as exc:
        return False, None, None, None, str(exc)
    except Exception as exc:
        return False, None, None, None, f"Unexpected error: {str(exc)}"


def inspect_dataset(data_dir: Path, expected_classes: List[str]) -> Tuple[Dict[str, ClassStats], List[str]]:
    """
    Scans dataset directory, inspects each expected class folder,
    and returns class statistics and list of unexpected folders.
    """
    stats_by_class: Dict[str, ClassStats] = {}
    extra_folders: List[str] = []

    if not data_dir.exists():
        print(f"\n[ERROR] Dataset root directory not found: {data_dir.resolve()}")
        return stats_by_class, extra_folders

    # Detect any extra directories not in expected classes
    existing_subdirs = [d.name for d in data_dir.iterdir() if d.is_dir() and not d.name.startswith(".")]
    for subdir in existing_subdirs:
        if subdir not in expected_classes:
            extra_folders.append(subdir)

    # Process each expected class
    for class_name in expected_classes:
        folder_path = data_dir / class_name
        class_stat = ClassStats(class_name, folder_path)
        stats_by_class[class_name] = class_stat

        if not class_stat.folder_exists:
            continue

        entries = sorted(list(folder_path.iterdir()), key=lambda p: p.name)
        for entry in entries:
            # Skip hidden metadata files (e.g. .DS_Store, .gitkeep)
            if entry.name.startswith("."):
                continue

            if not entry.is_file():
                continue

            class_stat.total_files += 1

            if entry.suffix.lower() not in VALID_IMAGE_EXTENSIONS:
                class_stat.record_unsupported(entry.name)
                continue

            is_valid, dims, mode, img_format, err_msg = verify_image(entry)
            if is_valid and dims and mode and img_format:
                class_stat.record_valid_image(dims[0], dims[1], mode, img_format)
            else:
                class_stat.record_corrupted(entry.name, err_msg or "Unknown error")

    return stats_by_class, extra_folders


def print_summary(
    stats_by_class: Dict[str, ClassStats],
    extra_folders: List[str],
    data_dir: Path,
    output_csv_path: Optional[Path] = None,
):
    """Prints a structured inspection report to stdout."""
    total_valid = sum(s.valid_images for s in stats_by_class.values())
    total_corrupted = sum(s.corrupted_images for s in stats_by_class.values())
    total_unsupported = sum(s.unsupported_files for s in stats_by_class.values())
    total_files = sum(s.total_files for s in stats_by_class.values())

    print("\n" + "=" * 80)
    print("WasteWise-AI: Dataset Quality & Structure Inspection Report")
    print("=" * 80)
    print(f"Target Directory: {data_dir.resolve()}")
    print(f"Total Folders Expected: {len(stats_by_class)}")
    print(f"Total Folders Present:  {sum(1 for s in stats_by_class.values() if s.folder_exists)}")

    if extra_folders:
        print(f"[!] Warning: Unexpected subdirectories found: {', '.join(extra_folders)}")

    print("\n" + "-" * 80)
    header = (
        f"{'Class':<12} | {'Exists':<6} | {'Valid':<7} | {'Corrupt':<7} | "
        f"{'Other':<5} | {'Share (%)':<9} | {'Common Res':<16} | {'Modes'}"
    )
    print(header)
    print("-" * 80)

    for class_name, stat in stats_by_class.items():
        if not stat.folder_exists:
            print(
                f"{class_name:<12} | {'NO':<6} | {'0':<7} | {'0':<7} | "
                f"{'0':<5} | {'0.0%':<9} | {'N/A':<16} | {'N/A'}"
            )
            continue

        pct = (stat.valid_images / total_valid * 100) if total_valid > 0 else 0.0
        modes_str = ", ".join(f"{k}:{v}" for k, v in stat.color_modes.items()) or "None"
        common_res = stat.most_common_dimension.split(" ")[0]

        print(
            f"{class_name:<12} | {'YES':<6} | {stat.valid_images:<7} | "
            f"{stat.corrupted_images:<7} | {stat.unsupported_files:<5} | "
            f"{pct:>7.2f}% | {common_res:<16} | {modes_str}"
        )

    print("-" * 80)
    overall_pct = 100.0 if total_valid > 0 else 0.0
    print(
        f"{'TOTAL':<12} | {'-':<6} | {total_valid:<7} | {total_corrupted:<7} | "
        f"{total_unsupported:<5} | {overall_pct:>7.2f}% | {'-':<16} | {'-'}"
    )
    print("-" * 80)

    # Dimensional summary
    all_dimensions = [dim for stat in stats_by_class.values() for dim in stat.dimensions]
    if all_dimensions:
        dim_counter = Counter(all_dimensions)
        min_w = min(w for w, h in all_dimensions)
        max_w = max(w for w, h in all_dimensions)
        min_h = min(h for w, h in all_dimensions)
        max_h = max(h for w, h in all_dimensions)
        print("\nDimensional Analysis:")
        print(f"  * Total Images Verified:      {len(all_dimensions)}")
        print(f"  * Distinct Resolutions:       {len(dim_counter)}")
        print(f"  * Min Resolution (W x H):     {min_w} x {min_h}")
        print(f"  * Max Resolution (W x H):     {max_w} x {max_h}")
        print("  * Top Resolutions:")
        for dim, count in dim_counter.most_common(3):
            pct = count / len(all_dimensions) * 100
            print(f"      - {dim[0]} x {dim[1]}: {count} images ({pct:.2f}%)")

    # Corruption & Issues summary
    print("\nDataset Integrity:")
    if total_corrupted == 0 and total_unsupported == 0:
        print("  [OK] All scanned images are valid, readable, and non-corrupted.")
    else:
        if total_corrupted > 0:
            print(f"  [!] Detected {total_corrupted} corrupted/unreadable image(s):")
            for stat in stats_by_class.values():
                for fname, err in stat.corrupted_file_list:
                    print(f"      - {stat.class_name}/{fname}: {err}")
        if total_unsupported > 0:
            print(f"  [!] Detected {total_unsupported} non-image/unsupported file(s):")
            for stat in stats_by_class.values():
                for fname in stat.unsupported_file_list:
                    print(f"      - {stat.class_name}/{fname}")

    # Class balance observation
    if total_valid > 0:
        print("\nClass Balance Observation:")
        min_class = min(stats_by_class.values(), key=lambda s: s.valid_images)
        max_class = max(stats_by_class.values(), key=lambda s: s.valid_images)
        imbalance_ratio = max_class.valid_images / min_class.valid_images if min_class.valid_images > 0 else 0
        print(
            f"  * Largest Class:  '{max_class.class_name}' ({max_class.valid_images} images, "
            f"{max_class.valid_images / total_valid * 100:.2f}%)"
        )
        print(
            f"  * Smallest Class: '{min_class.class_name}' ({min_class.valid_images} images, "
            f"{min_class.valid_images / total_valid * 100:.2f}%)"
        )
        print(
            f"  * Imbalance Ratio: {imbalance_ratio:.2f}x "
            f"(Recommendation: Apply class weighting or augmentation during CNN training)"
        )

    if output_csv_path:
        print(f"\n[OK] Summary report successfully written to: {output_csv_path.resolve()}")
    print("=" * 80 + "\n")


def save_summary_to_csv(
    stats_by_class: Dict[str, ClassStats],
    output_path: Path,
):
    """Saves class-level statistics and total summary to a CSV file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total_valid = sum(s.valid_images for s in stats_by_class.values())
    total_corrupted = sum(s.corrupted_images for s in stats_by_class.values())
    total_unsupported = sum(s.unsupported_files for s in stats_by_class.values())
    total_files = sum(s.total_files for s in stats_by_class.values())

    fieldnames = [
        "class_name",
        "folder_exists",
        "total_files",
        "valid_images",
        "corrupted_images",
        "unsupported_files",
        "percentage",
        "min_dimension",
        "max_dimension",
        "most_common_dimension",
        "color_modes",
        "formats",
    ]

    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for class_name, stat in stats_by_class.items():
            pct = (stat.valid_images / total_valid * 100) if total_valid > 0 else 0.0
            modes_str = ";".join(f"{k}:{v}" for k, v in stat.color_modes.items())
            formats_str = ";".join(f"{k}:{v}" for k, v in stat.image_formats.items())
            common_dim = stat.most_common_dimension.split(" ")[0] if stat.dimensions else "N/A"

            writer.writerow(
                {
                    "class_name": class_name,
                    "folder_exists": stat.folder_exists,
                    "total_files": stat.total_files,
                    "valid_images": stat.valid_images,
                    "corrupted_images": stat.corrupted_images,
                    "unsupported_files": stat.unsupported_files,
                    "percentage": f"{pct:.2f}%",
                    "min_dimension": stat.min_dimension,
                    "max_dimension": stat.max_dimension,
                    "most_common_dimension": common_dim,
                    "color_modes": modes_str or "N/A",
                    "formats": formats_str or "N/A",
                }
            )

        # Write TOTAL summary row
        all_dims = [dim for stat in stats_by_class.values() for dim in stat.dimensions]
        if all_dims:
            total_min = f"{min(w for w, h in all_dims)}x{min(h for w, h in all_dims)}"
            total_max = f"{max(w for w, h in all_dims)}x{max(h for w, h in all_dims)}"
            total_common = Counter(all_dims).most_common(1)[0][0]
            total_common_str = f"{total_common[0]}x{total_common[1]}"
        else:
            total_min = total_max = total_common_str = "N/A"

        total_modes = Counter()
        total_formats = Counter()
        for stat in stats_by_class.values():
            total_modes.update(stat.color_modes)
            total_formats.update(stat.image_formats)

        writer.writerow(
            {
                "class_name": "TOTAL",
                "folder_exists": all(s.folder_exists for s in stats_by_class.values()),
                "total_files": total_files,
                "valid_images": total_valid,
                "corrupted_images": total_corrupted,
                "unsupported_files": total_unsupported,
                "percentage": "100.00%",
                "min_dimension": total_min,
                "max_dimension": total_max,
                "most_common_dimension": total_common_str,
                "color_modes": ";".join(f"{k}:{v}" for k, v in total_modes.items()),
                "formats": ";".join(f"{k}:{v}" for k, v in total_formats.items()),
            }
        )


def main():
    parser = argparse.ArgumentParser(
        description="Inspect and verify dataset structure and image integrity for WasteWise-AI."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=Path("ml/data/trashnet"),
        help="Path to dataset root folder containing class subdirectories (default: ml/data/trashnet)",
    )
    parser.add_argument(
        "--output-csv",
        type=Path,
        default=Path("ml/outputs/dataset_summary.csv"),
        help="Path to save the summary CSV output (default: ml/outputs/dataset_summary.csv)",
    )
    parser.add_argument(
        "--classes",
        nargs="+",
        default=DEFAULT_CLASSES,
        help="List of expected class subdirectories (default: cardboard glass metal paper plastic trash)",
    )

    args = parser.parse_args()

    stats_by_class, extra_folders = inspect_dataset(args.data_dir, args.classes)
    save_summary_to_csv(stats_by_class, args.output_csv)
    print_summary(stats_by_class, extra_folders, args.data_dir, args.output_csv)


if __name__ == "__main__":
    main()
