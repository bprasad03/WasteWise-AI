"""
WasteWise-AI: Recycling Service Unit Tests
==========================================
Verifies that all waste classes have structured bin recommendations,
clean instructions, and the required municipal disclaimer.
"""

import pytest
from backend.services.recycling_service import (
    MUNICIPAL_DISCLAIMER,
    RECYCLING_GUIDANCE_CATALOG,
    get_recycling_guidance,
)

EXPECTED_CLASSES = ["cardboard", "glass", "metal", "paper", "plastic", "trash"]


@pytest.mark.parametrize("class_name", EXPECTED_CLASSES)
def test_all_classes_have_guidance(class_name: str):
    """Ensures each of the six waste classes returns complete, structured guidance."""
    guidance = get_recycling_guidance(class_name)

    assert guidance.bin_name, f"Class '{class_name}' missing bin_name"
    assert guidance.bin_color, f"Class '{class_name}' missing bin_color"
    assert len(guidance.instructions) >= 2, f"Class '{class_name}' must have at least 2 instructions"
    assert guidance.disclaimer == MUNICIPAL_DISCLAIMER
    assert "Guidance only" in guidance.disclaimer
    assert "municipality" in guidance.disclaimer.lower()


def test_case_insensitive_lookup():
    """Verifies that class name lookups are case-insensitive and handle whitespace."""
    guidance_upper = get_recycling_guidance("  CARDBOARD  ")
    guidance_lower = get_recycling_guidance("cardboard")

    assert guidance_upper.bin_name == guidance_lower.bin_name
    assert guidance_upper.instructions == guidance_lower.instructions


def test_unknown_class_fallback():
    """Verifies fallback guidance for unexpected or unknown class queries."""
    guidance = get_recycling_guidance("unknown_material_xyz")

    assert "General Waste" in guidance.bin_name
    assert guidance.disclaimer == MUNICIPAL_DISCLAIMER
