"""
WasteWise-AI: Recycling Recommendation Service
===============================================
Maps classified waste categories to practical recycling bin recommendations,
item preparation instructions, and municipal guidance disclaimers.
"""

from typing import Dict
from backend.app.schemas import RecyclingGuidance

# Standard disclaimer explicitly noting municipal rule variance
MUNICIPAL_DISCLAIMER = (
    "Guidance only: Recycling rules, accepted items, and bin color coding vary "
    "by city, county, and local waste management contractor. Always check your "
    "local municipality's official waste sorting guidelines."
)

# Standardized recycling recommendations per class
RECYCLING_GUIDANCE_CATALOG: Dict[str, Dict] = {
    "cardboard": {
        "bin_name": "Paper & Cardboard Recycling Bin",
        "bin_color": "Blue",
        "instructions": [
            "Flatten boxes completely to conserve bin capacity.",
            "Ensure cardboard is clean, dry, and free of moisture.",
            "Remove plastic tape, styrofoam inserts, and bubble wrap.",
            "Greasy or food-stained cardboard (e.g. greasy pizza box bottoms) cannot be recycled and must go into general waste or organic compost where accepted.",
        ],
    },
    "glass": {
        "bin_name": "Glass Container Recycling Bin / Bottle Bank",
        "bin_color": "Green (or dedicated Glass Caddy)",
        "instructions": [
            "Empty all liquids and lightly rinse containers to remove food remnants.",
            "Remove metal caps and lids (metal lids can typically be recycled with metals).",
            "Keep containers intact; do not break glass bottles or jars.",
            "Do not include light bulbs, mirror glass, window panes, drinking glasses, or ceramic/Pyrex cookware.",
        ],
    },
    "metal": {
        "bin_name": "Metals & Cans Recycling Bin",
        "bin_color": "Blue / Commingled Mixed Recyclables",
        "instructions": [
            "Empty and rinse aluminum beverage cans and steel/tin food cans.",
            "Clean aluminum foil and ball it up to at least 2 inches (5 cm) in diameter.",
            "Ensure aerosol cans are completely empty before disposal.",
            "Do not place propane tanks, paint cans, sharp needles, or automotive metal parts in standard curbside bins.",
        ],
    },
    "paper": {
        "bin_name": "Paper Recycling Bin",
        "bin_color": "Blue",
        "instructions": [
            "Keep paper clean, dry, and unsoiled.",
            "Includes office printing paper, newspapers, magazines, catalogs, and envelopes.",
            "Remove plastic wrapping, sticky notes, or metal spiral bindings when possible.",
            "Do not recycle soiled paper napkins, tissues, paper towels, or wax-coated / thermal receipt paper.",
        ],
    },
    "plastic": {
        "bin_name": "Plastics & Mixed Recyclables Bin",
        "bin_color": "Yellow / Blue (Commingled)",
        "instructions": [
            "Empty liquids and rinse food residue from bottles, jugs, and tubs.",
            "Check the Resin Identification Code (numbers 1 [PET] and 2 [HDPE] are universally accepted; 3–7 depend on local facilities).",
            "Screw plastic caps back onto empty bottles if accepted by your local program.",
            "Do not place soft plastic films, plastic bags, bubble wrap, or styrofoam in curbside bins unless specially designated.",
        ],
    },
    "trash": {
        "bin_name": "General Waste / Landfill Bin",
        "bin_color": "Black / Dark Gray",
        "instructions": [
            "Bag items securely before placing in the general waste bin.",
            "Suitable for non-recyclable composite packaging, multi-material wrappers, contaminated food containers, and broken household items.",
            "Hazardous materials (batteries, fluorescent bulbs, electronics, chemicals) must NOT go in standard trash—take them to a designated e-waste or hazard drop-off.",
        ],
    },
}

DEFAULT_FALLBACK_GUIDANCE = {
    "bin_name": "General Waste / Landfill Bin",
    "bin_color": "Black / Dark Gray",
    "instructions": [
        "Dispose of with general non-recyclable waste if item material is uncertain.",
        "Check with your local waste management provider for material-specific guidance.",
    ],
}


def get_recycling_guidance(class_name: str) -> RecyclingGuidance:
    """
    Retrieves the recycling bin recommendation and instructions for a waste class.

    Args:
        class_name: Classified waste category name (lowercase).

    Returns:
        RecyclingGuidance: Structured bin recommendation with disclaimer.
    """
    normalized_name = class_name.strip().lower()
    info = RECYCLING_GUIDANCE_CATALOG.get(normalized_name, DEFAULT_FALLBACK_GUIDANCE)

    return RecyclingGuidance(
        bin_name=info["bin_name"],
        bin_color=info["bin_color"],
        instructions=info["instructions"],
        disclaimer=MUNICIPAL_DISCLAIMER,
    )
