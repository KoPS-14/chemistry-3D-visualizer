"""
Reaction Rules Module

Defines exactly 5 validated RDKit reaction SMARTS rules with atom mapping,
metadata, animation stage narrations, and baseline activation energies for educational kinetics.
"""
from typing import Dict, Any, List

# EXACTLY 5 reaction rules with full atom mapping
REACTION_RULES: List[Dict[str, Any]] = [
    {
        "id": "sn2_nucleophilic_substitution",
        "name": "Bimolecular Nucleophilic Substitution (SN2)",
        "description": "An electron-rich nucleophile attacks an sp3 carbon from 180 degrees opposite the halide leaving group, inverting stereochemistry.",
        "smarts": "[C:1][Cl,Br,I:2].[O,S,N,C;-:3]>>[C:1][*+0:3].[Cl,Br,I-:2]",
        # Dedicated specialized SMARTS for hydroxide nucleophile if needed:
        "fallback_smarts": "[C:1][Cl,Br,I:2].[O-:3]>>[C:1][O+0:3].[Cl,Br,I-:2]",
        "narration": [
            "Reactant approach: Nucleophile aligns 180 degrees opposite the carbon-halogen bond.",
            "Backside attack: Nucleophile forms a partial bond while the carbon-halide bond elongates.",
            "Trigonal bipyramidal transition state: Central carbon momentarily shares partial bonds with both groups.",
            "Walden inversion and departure: Halide leaves as an anion while the product configuration inverts."
        ],
        "baseline_ea_kj": 75.0,
        "test_reactants": ("CBr", "[OH-]"),
        "expected_products": ("CO", "[Br-]")
    },
    {
        "id": "esterification",
        "name": "Fischer Esterification",
        "description": "Condensation reaction between a carboxylic acid and an alcohol yielding an ester and water.",
        "smarts": "[CX3:1](=[OX1:2])[OX2H1:3].[OX2H1:4][CX4:5]>>[CX3:1](=[OX1:2])[OX2:4][CX4:5].[OX2H2:3]",
        "narration": [
            "Protonation & approach: The alcohol oxygen nucleophile approaches the carbonyl carbon of the carboxylic acid.",
            "Tetrahedral intermediate: Nucleophilic attack forms a tetrahedral transition state.",
            "Proton transfer: Hydroxyl group is protonated into a leaving water molecule.",
            "Elimination: Carbonyl pi-bond reforms as water departs, completing the ester."
        ],
        "baseline_ea_kj": 68.0,
        "test_reactants": ("CC(=O)O", "CCO"),
        "expected_products": ("CCOC(C)=O", "O")
    },
    {
        "id": "acid_base_neutralization",
        "name": "Acid-Base Neutralization",
        "description": "Proton transfer from a mineral/halide acid to a hydroxide base producing water and a salt.",
        "smarts": "([Cl,Br,I:1]).([OH-:2].[Na+,K+:3])>>([OX2H2+0:2]).([Na+,K+:3].[Cl,Br,I-:1])",
        "narration": [
            "Diffusion & ionic approach: Hydronium/acid and hydroxide ions migrate together in solution.",
            "Proton transfer: Rapid proton transfer neutralizes hydroxide into covalent water.",
            "Hydration sphere formation: Spectator ions (metal cation and halide anion) dissociate as solvated salt."
        ],
        "baseline_ea_kj": 12.0,
        "test_reactants": ("Cl", "[OH-].[Na+]"),
        "expected_products": ("O", "[Cl-].[Na+]")
    },
    {
        "id": "amide_formation",
        "name": "Amide Coupling (Condensation)",
        "description": "Condensation between a carboxylic acid and a primary or secondary amine yielding an amide and water.",
        "smarts": "[CX3:1](=[OX1:2])[OX2H1:3].[NX3H2,NX3H1:4][CX4:5]>>[CX3:1](=[OX1:2])[NX3:4][CX4:5].[OX2H2:3]",
        "narration": [
            "Nucleophilic attack: Lone pair on the amine nitrogen attacks the carbonyl carbon.",
            "Zwitterionic intermediate: Transition state forms with a tetrahedral carbon center.",
            "Proton transfer: Hydrogen transfers to the carboxylic hydroxyl group.",
            "Water elimination: Water departs, establishing the resonant amide bond."
        ],
        "baseline_ea_kj": 72.0,
        "test_reactants": ("CC(=O)O", "CCN"),
        "expected_products": ("CCNC(C)=O", "O")
    },
    {
        "id": "alkene_hydration",
        "name": "Alkene Hydration",
        "description": "Addition of water across an alkene double bond to form an alcohol.",
        "smarts": "[CX3:1]=[CX3:2].[OX2H2:3]>>[CX4:1][CX4:2][OX2:3]",
        "narration": [
            "Electrophilic approach: Water molecule approaches the electron-dense alkene pi system.",
            "Pi-bond cleavage: The carbon-carbon double bond opens as electrophilic addition proceeds.",
            "Hydration completion: Hydroxyl and hydrogen add across the carbons, yielding the saturated alcohol."
        ],
        "baseline_ea_kj": 60.0,
        "test_reactants": ("C=C", "O"),
        "expected_products": ("CCO",)
    }
]


def get_rule_by_id(rule_id: str) -> Dict[str, Any] | None:
    for rule in REACTION_RULES:
        if rule["id"] == rule_id:
            return rule
    return None
