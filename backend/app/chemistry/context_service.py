import re
from typing import Optional, List
from app.chemistry.lookup_service import LookupService

COMMON_TOPICS = {
    "chemistry": (
        "Chemistry is the branch of science studying the composition, structure, properties, "
        "and changes of matter, atomic/molecular bonding, and associated energy dynamics."
    ),
    "first chemistry invention": (
        "Early chemical milestones include prehistoric fire-making, copper extraction and smelting (~4500 BC), "
        "glassmaking in ancient Mesopotamia and Egypt (~3500 BC), fermentation, and synthetic pigments (Egyptian blue)."
    ),
    "first invention": (
        "Early human inventions include stone cutting tools (Oldowan, ~2.6 million years ago), "
        "controlled use of fire (~1 million years ago), ceramic pottery (~20,000 BC), and copper smelting (~4500 BC)."
    ),
    "matter": (
        "Matter is anything that possesses mass and occupies physical space, existing in solid, liquid, gas, and plasma phases."
    ),
    "atom": (
        "An atom is the basic structural unit of chemical elements, featuring a dense nucleus of protons and neutrons "
        "surrounded by quantized electron shells."
    ),
    "hybridization": (
        "Orbital hybridization is the concept of mixing atomic orbitals (s, p, d) into new hybrid orbitals "
        "with equivalent energy and defined spatial geometries (e.g. sp³ tetrahedral 109.5°, sp² trigonal planar 120°, sp linear 180°)."
    )
}

KNOWN_MOLECULES = {
    "methane": {
        "formula": "CH₄",
        "geometry": "Tetrahedral",
        "hybridization": "sp³",
        "bond_angle": "109.5°",
        "details": "Carbon forms 4 identical sigma bonds with hydrogen atoms; sp³ hybridized with 109.5° bond angle."
    },
    "ethane": {
        "formula": "C₂H₆",
        "geometry": "Tetrahedral around each carbon",
        "hybridization": "sp³",
        "bond_angle": "109.5°",
        "details": "Both carbon atoms are sp³ hybridized (tetrahedral geometry around each C) with a single C-C bond."
    },
    "ethene": {
        "formula": "C₂H₄",
        "geometry": "Trigonal planar",
        "hybridization": "sp²",
        "bond_angle": "120°",
        "details": "Contains one C=C double bond (1 sigma + 1 pi bond); planar geometry with 120° bond angles."
    },
    "ethylene": {
        "formula": "C₂H₄",
        "geometry": "Trigonal planar",
        "hybridization": "sp²",
        "bond_angle": "120°",
        "details": "Planar alkene with sp² hybridized carbons and 120° bond angles."
    },
    "ethyne": {
        "formula": "C₂H₂",
        "geometry": "Linear",
        "hybridization": "sp",
        "bond_angle": "180°",
        "details": "Contains one C≡C triple bond (1 sigma + 2 pi bonds); linear geometry with 180° bond angles."
    },
    "acetylene": {
        "formula": "C₂H₂",
        "geometry": "Linear",
        "hybridization": "sp",
        "bond_angle": "180°",
        "details": "Linear alkyne with sp hybridized carbons and 180° bond angles."
    },
    "benzene": {
        "formula": "C₆H₆",
        "geometry": "Planar hexagonal ring",
        "hybridization": "sp²",
        "bond_angle": "120°",
        "details": "Aromatic planar ring with delocalized pi electron system and 120° C-C-C bond angles."
    },
    "water": {
        "formula": "H₂O",
        "geometry": "Bent (angular)",
        "hybridization": "sp³",
        "bond_angle": "104.5°",
        "details": "Oxygen has 2 bonding pairs and 2 lone pairs; lone pair repulsion compresses H-O-H angle to 104.5°."
    },
    "carbon dioxide": {
        "formula": "CO₂",
        "geometry": "Linear",
        "hybridization": "sp",
        "bond_angle": "180°",
        "details": "Linear molecule with two double bonds (O=C=O), sp hybridized carbon, and 180° bond angle."
    },
    "co2": {
        "formula": "CO₂",
        "geometry": "Linear",
        "hybridization": "sp",
        "bond_angle": "180°",
        "details": "Linear molecule with two double bonds (O=C=O), sp hybridized carbon, and 180° bond angle."
    },
    "carbon disulfide": {
        "formula": "CS₂",
        "geometry": "Linear",
        "hybridization": "sp",
        "bond_angle": "180°",
        "details": "Linear molecule with two double bonds (S=C=S), sp hybridized carbon, and 180° bond angle (not planar/sp²)."
    },
    "cs2": {
        "formula": "CS₂",
        "geometry": "Linear",
        "hybridization": "sp",
        "bond_angle": "180°",
        "details": "Linear molecule with two double bonds (S=C=S), sp hybridized carbon, and 180° bond angle."
    },
    "ammonia": {
        "formula": "NH₃",
        "geometry": "Trigonal pyramidal",
        "hybridization": "sp³",
        "bond_angle": "107°",
        "details": "Nitrogen has 3 N-H bonds and 1 lone pair; sp³ hybridized with 107° bond angle."
    }
}


class ContextEnrichmentService:
    @staticmethod
    def get_enriched_context(query: str) -> Optional[str]:
        """
        Extracts verified factual knowledge relevant to the user query
        from local chemistry datasets, periodic table, molecules, and reaction templates.
        """
        q = query.lower().strip()
        context_parts: List[str] = []

        # 1. Match common foundational chemical concepts
        for topic, text in COMMON_TOPICS.items():
            if topic in q:
                context_parts.append(f"• General Knowledge ({topic.capitalize()}): {text}")
                break

        # 2. Match known molecules
        for mol_name, data in KNOWN_MOLECULES.items():
            if re.search(r"\b" + re.escape(mol_name) + r"\b", q):
                context_parts.append(
                    f"• Molecule Knowledge ({data['formula']}): {data['geometry']} geometry, "
                    f"hybridization {data['hybridization']}, bond angle {data['bond_angle']}. {data['details']}"
                )
                if len(context_parts) >= 2:
                    break

        # 3. Match periodic table elements
        elements = LookupService.get_all_elements()
        for el in elements:
            name = el.get("name", "").lower()
            symbol = el.get("symbol", "").lower()
            # Match element name as a distinct word
            if re.search(r"\b" + re.escape(name) + r"\b", q):
                context_parts.append(
                    f"• Element Knowledge ({el['name']} / {el['symbol']}): Atomic #{el['atomic_number']}, "
                    f"Group {el.get('group', 'N/A')}, Period {el.get('period', 'N/A')}, "
                    f"Category: {el.get('category', 'unknown')}, Electron Config: {el.get('electron_configuration', 'N/A')}, "
                    f"Atomic Mass: {el.get('atomic_mass', 'N/A')} u. {el.get('summary', '')[:140]}"
                )
                if len(context_parts) >= 3:
                    break

        # 4. Match curated chemical reactions
        rxn = LookupService.find_reaction(name=q, reaction_type=q)
        if rxn:
            eq = rxn.get("balanced_equation", "N/A")
            desc = rxn.get("description", "")
            context_parts.append(
                f"• Reaction Knowledge ({rxn.get('name')}): Type: {rxn.get('reaction_type')}, "
                f"Balanced Equation: {eq}. {desc[:140]}"
            )

        if not context_parts:
            return None

        return "\n".join(context_parts)
