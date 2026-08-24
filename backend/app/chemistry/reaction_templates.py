"""
Reaction Templates Module

Defines validated procedural animation templates, transition state geometries,
keyframes, and bond breaking/forming rules for 25 chemical reactions.
"""
from typing import Dict, Any, Optional, List

REACTION_CLASS_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "SN2": {
        "class_name": "Nucleophilic Substitution (SN2)",
        "stages": [
            "1. Backside Nucleophilic Attack",
            "2. Trigonal Bipyramidal Transition State",
            "3. Walden Stereochemical Inversion & Leaving Group Departure"
        ],
        "keyframes": [
            {
                "progress": 0.0,
                "stage_name": "Initial Reactant Alignment",
                "description": "Nucleophile approaches the carbon center from 180 degrees opposite the leaving group.",
                "reactant_offset": [-4.5, 0.0, 0.0],
                "product_offset": [0.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            },
            {
                "progress": 0.40,
                "stage_name": "Backside Attack & Bond Stretching",
                "description": "Nucleophile forms partial bond while carbon-leaving group bond stretches.",
                "reactant_offset": [-1.8, 0.0, 0.0],
                "product_offset": [0.0, 0.0, 0.0],
                "bond_stretch": 1.35,
                "transition_state_active": False
            },
            {
                "progress": 0.65,
                "stage_name": "Pentacoordinate Transition State",
                "description": "Central carbon achieves planar trigonal bipyramidal geometry with partial C-Nu and C-LG bonds.",
                "reactant_offset": [-0.6, 0.0, 0.0],
                "product_offset": [0.6, 0.0, 0.0],
                "bond_stretch": 1.6,
                "transition_state_active": True
            },
            {
                "progress": 1.0,
                "stage_name": "Walden Inversion & Departure",
                "description": "Umbelliferous Walden inversion flips carbon substituents; leaving group departs as an anion.",
                "reactant_offset": [0.0, 0.0, 0.0],
                "product_offset": [4.5, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            }
        ]
    },
    "ADDITION": {
        "class_name": "Electrophilic / Catalytic Addition",
        "stages": [
            "1. Reactant Approach & Collision",
            "2. Pi-Bond Breaking & Cyclovalerian Transition State",
            "3. Product Formation & Bond Cleavage"
        ],
        "keyframes": [
            {
                "progress": 0.0,
                "stage_name": "Reactant Approach",
                "description": "Reactant molecules align above and below the planar alkene pi-system.",
                "reactant_offset": [0.0, 3.5, 0.0],
                "product_offset": [0.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            },
            {
                "progress": 0.50,
                "stage_name": "Pi-Bond Opening & Transition State",
                "description": "C=C double bond breaks into single bond as new sigma C-X/C-H bonds form.",
                "reactant_offset": [0.0, 1.2, 0.0],
                "product_offset": [0.0, -1.2, 0.0],
                "bond_stretch": 1.4,
                "transition_state_active": True
            },
            {
                "progress": 1.0,
                "stage_name": "Saturated Product Formation",
                "description": "Substituents lock into tetrahedral sp3 geometry.",
                "reactant_offset": [0.0, 0.0, 0.0],
                "product_offset": [0.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            }
        ]
    },
    "NEUTRALIZATION": {
        "class_name": "Acid-Base Neutralization",
        "stages": [
            "1. Ion Pair Diffusion & Approach",
            "2. Proton Transfer & H-O Bond Formation",
            "3. Solvated Salt & Water Separation"
        ],
        "keyframes": [
            {
                "progress": 0.0,
                "stage_name": "Reactant Diffusion",
                "description": "Acid and base species collide in aqueous phase.",
                "reactant_offset": [-3.5, 0.0, 0.0],
                "product_offset": [3.5, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            },
            {
                "progress": 0.50,
                "stage_name": "Proton Transfer",
                "description": "Proton transfers from acid donor to basic lone pair forming covalent H-O bond.",
                "reactant_offset": [-0.8, 0.0, 0.0],
                "product_offset": [0.8, 0.0, 0.0],
                "bond_stretch": 1.5,
                "transition_state_active": True
            },
            {
                "progress": 1.0,
                "stage_name": "Neutral Salt & Water",
                "description": "Stable water molecule and solvated counterions separate.",
                "reactant_offset": [0.0, 0.0, 0.0],
                "product_offset": [4.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            }
        ]
    },
    "ELIMINATION": {
        "class_name": "Elimination (E2 / E1)",
        "stages": [
            "1. Base Alignment & Beta-Proton Extraction",
            "2. Concerted C=C Pi-Bond Formation",
            "3. Leaving Group Separation"
        ],
        "keyframes": [
            {
                "progress": 0.0,
                "stage_name": "Anti-Periplanar Alignment",
                "description": "Strong base approaches beta-hydrogen anti-periplanar to leaving group.",
                "reactant_offset": [0.0, 3.2, 0.0],
                "product_offset": [0.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            },
            {
                "progress": 0.55,
                "stage_name": "Concerted Transition State",
                "description": "Beta C-H bond breaks, C-C double bond forms, leaving group departs.",
                "reactant_offset": [0.0, 1.0, 0.0],
                "product_offset": [2.5, 0.0, 0.0],
                "bond_stretch": 1.45,
                "transition_state_active": True
            },
            {
                "progress": 1.0,
                "stage_name": "Alkene Product Formation",
                "description": "Planar sp2 alkene formed with water/conjugate acid and leaving group anion.",
                "reactant_offset": [0.0, 0.0, 0.0],
                "product_offset": [4.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            }
        ]
    },
    "COMBUSTION": {
        "class_name": "Exothermic Combustion",
        "stages": [
            "1. Thermal Ignition & O2 Collision",
            "2. C-H & O=O Homolytic Fragmentation",
            "3. Highly Exothermic CO2 & H2O Formation"
        ],
        "keyframes": [
            {
                "progress": 0.0,
                "stage_name": "Reactant Mixing",
                "description": "Hydrocarbon fuel collides with diatomic oxygen gas.",
                "reactant_offset": [-3.0, 0.0, 0.0],
                "product_offset": [3.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            },
            {
                "progress": 0.50,
                "stage_name": "Radical Fragmentation Transition State",
                "description": "High-energy cleavage of C-C and C-H bonds with oxygen radical attack.",
                "reactant_offset": [-0.5, 0.0, 0.0],
                "product_offset": [0.5, 0.0, 0.0],
                "bond_stretch": 1.5,
                "transition_state_active": True
            },
            {
                "progress": 1.0,
                "stage_name": "CO2 & Water Vapor Release",
                "description": "Stable double-bonded CO2 and bent H2O molecules form with large enthalpy release.",
                "reactant_offset": [0.0, 0.0, 0.0],
                "product_offset": [4.5, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            }
        ]
    },
    "OXIDATION": {
        "class_name": "Organic Oxidation",
        "stages": [
            "1. Dehydrogenation / Oxygen Addition",
            "2. Carbonyl C=O Double Bond Formation",
            "3. Oxidized Product & Water Byproduct"
        ],
        "keyframes": [
            {
                "progress": 0.0,
                "stage_name": "Substrate & Oxidant Collision",
                "description": "Oxidant approaches alcohol C-H and O-H bonds.",
                "reactant_offset": [-2.8, 0.0, 0.0],
                "product_offset": [2.8, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            },
            {
                "progress": 0.50,
                "stage_name": "Dehydrogenation Transition State",
                "description": "Two alpha/hydroxyl hydrogens abstract as carbon-oxygen single bond shortens into carbonyl C=O.",
                "reactant_offset": [-0.6, 0.0, 0.0],
                "product_offset": [0.6, 0.0, 0.0],
                "bond_stretch": 1.35,
                "transition_state_active": True
            },
            {
                "progress": 1.0,
                "stage_name": "Carbonyl Product & Water",
                "description": "Planar aldehyde/ketone carbonyl formed with water byproduct.",
                "reactant_offset": [0.0, 0.0, 0.0],
                "product_offset": [3.8, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            }
        ]
    },
    "GENERAL": {
        "class_name": "Chemical Transformation",
        "stages": [
            "1. Reactant Approach",
            "2. Transition State",
            "3. Product Separation"
        ],
        "keyframes": [
            {
                "progress": 0.0,
                "stage_name": "Reactant Approach",
                "description": "Reactants approach to form active collision complex.",
                "reactant_offset": [-3.0, 0.0, 0.0],
                "product_offset": [3.0, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            },
            {
                "progress": 0.50,
                "stage_name": "Transition State",
                "description": "Bonds stretch and rearrange at peak activation energy.",
                "reactant_offset": [-0.5, 0.0, 0.0],
                "product_offset": [0.5, 0.0, 0.0],
                "bond_stretch": 1.4,
                "transition_state_active": True
            },
            {
                "progress": 1.0,
                "stage_name": "Product Formation",
                "description": "Products stabilize and separate into final positions.",
                "reactant_offset": [0.0, 0.0, 0.0],
                "product_offset": [3.5, 0.0, 0.0],
                "bond_stretch": 1.0,
                "transition_state_active": False
            }
        ]
    }
}


def get_reaction_animation_template(reaction_type: str) -> Dict[str, Any]:
    rxn_type_clean = reaction_type.upper().strip()
    
    if "SN2" in rxn_type_clean:
        return REACTION_CLASS_TEMPLATES["SN2"]
    elif "ADDITION" in rxn_type_clean:
        return REACTION_CLASS_TEMPLATES["ADDITION"]
    elif "NEUTRALIZATION" in rxn_type_clean or "ACIDBASE" in rxn_type_clean:
        return REACTION_CLASS_TEMPLATES["NEUTRALIZATION"]
    elif "ELIMINATION" in rxn_type_clean or "E2" in rxn_type_clean or "E1" in rxn_type_clean:
        return REACTION_CLASS_TEMPLATES["ELIMINATION"]
    elif "COMBUSTION" in rxn_type_clean:
        return REACTION_CLASS_TEMPLATES["COMBUSTION"]
    elif "OXIDATION" in rxn_type_clean:
        return REACTION_CLASS_TEMPLATES["OXIDATION"]
    else:
        return REACTION_CLASS_TEMPLATES["GENERAL"]
