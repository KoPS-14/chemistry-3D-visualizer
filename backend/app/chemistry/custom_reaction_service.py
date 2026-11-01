import urllib.request
import urllib.parse
import json
import ssl
import logging
import itertools
from typing import List, Dict, Any, Optional, Tuple

from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors

from app.chemistry.reaction_rules import REACTION_RULES, get_rule_by_id
from app.chemistry.rdkit_service import RDKitService, CPK_COLORS
from app.schemas.custom_reaction_models import (
    CustomReactionRequest,
    CustomReactionResponse,
    MatchedRuleOption,
    MappedAtomPair,
    BondChange,
    ReactionState3D,
    MoleculeAnalysisData,
)
from app.schemas.models import MoleculeData, AtomData, BondData, ReactionConditions

logger = logging.getLogger(__name__)

# Offline dictionary for common reagents to ensure robust, instant offline execution & unit tests
OFFLINE_REAGENT_CACHE: Dict[str, str] = {
    "bromomethane": "CBr",
    "methyl bromide": "CBr",
    "hydroxide": "[OH-]",
    "hydroxide ion": "[OH-]",
    "acetic acid": "CC(=O)O",
    "ethanoic acid": "CC(=O)O",
    "ethanol": "CCO",
    "ethyl alcohol": "CCO",
    "hydrochloric acid": "Cl",
    "hydrogen chloride": "Cl",
    "sodium hydroxide": "[OH-].[Na+]",
    "ethylamine": "CCN",
    "aminoethane": "CCN",
    "n-ethylacetamide": "CCNC(=O)C",
    "ethyl acetate": "CCOC(=O)C",
    "ethene": "C=C",
    "ethylene": "C=C",
    "water": "O",
    "sodium chloride": "[Cl-].[Na+]",
    "methanol": "CO",
    "bromide": "[Br-]",
    "bromide ion": "[Br-]",
    "gold": "[Au]",
    "mercury": "[Hg]",
    "benzene": "c1ccccc1",
    "methane": "C",
    "propane": "CCC",
    "propene": "CC=C",
    "acetone": "CC(=O)C",
}

FUNCTIONAL_GROUP_SMARTS = [
    ("Carboxylic Acid", "[CX3](=O)[OX2H1]"),
    ("Ester", "[CX3](=O)[OX2H0][#6]"),
    ("Alcohol", "[OX2H;!$(C=O)]"),
    ("Primary/Secondary Amine", "[NX3H1,NX3H2;!$(NC=O)]"),
    ("Tertiary Amine", "[NX3H0;!$(NC=O)]"),
    ("Alkene", "[CX3]=[CX3]"),
    ("Alkyne", "[CX2]#[CX2]"),
    ("Alkyl Halide", "[CX4][Cl,Br,I]"),
    ("Aromatic Ring", "a1aaaaa1"),
    ("Hydroxide Anion", "[OH-]"),
    ("Halide Anion", "[F-,Cl-,Br-,I-]"),
    ("Carbonyl (Ketone/Aldehyde)", "[CX3]=O"),
]


class CustomReactionService:
    @staticmethod
    def resolve_name_to_smiles(query: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolves a chemical name or raw SMILES into a canonical SMILES string.
        1. Tests if query is already a valid RDKit SMILES.
        2. Checks local reagent cache.
        3. Queries PubChem PUG REST API.
        """
        clean_query = query.strip()
        if not clean_query:
            return None, "Empty reactant query."

        # 1. Direct SMILES check (if query is already a valid SMILES)
        mol_direct = Chem.MolFromSmiles(clean_query)
        if mol_direct is not None:
            return clean_query, None

        # 2. Check offline reagent cache (case-insensitive)
        lower_q = clean_query.lower()
        if lower_q in OFFLINE_REAGENT_CACHE:
            return OFFLINE_REAGENT_CACHE[lower_q], None

        # 3. Query PubChem PUG REST API
        encoded_name = urllib.parse.quote(clean_query)
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/property/CanonicalSMILES,ConnectivitySMILES/JSON"
        try:
            ctx = ssl._create_unverified_context()
            req = urllib.request.Request(url, headers={"User-Agent": "ChemAI-CustomReaction/1.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
                if response.status == 200:
                    payload = json.loads(response.read().decode("utf-8"))
                    props = payload.get("PropertyTable", {}).get("Properties", [])
                    if props:
                        first_prop = props[0]
                        smiles = first_prop.get("CanonicalSMILES") or first_prop.get("ConnectivitySMILES")
                        if smiles:
                            # Validate with RDKit
                            if Chem.MolFromSmiles(smiles) is not None:
                                return smiles, None
        except Exception as e:
            logger.info(f"PubChem lookup failed for '{clean_query}': {e}")

        return None, f"Could not resolve chemical name '{clean_query}' to a valid structure via PubChem PUG REST."

    @staticmethod
    def compute_molecule_analysis(mol: Chem.Mol, name: str, smiles: str) -> MoleculeAnalysisData:
        formula = rdMolDescriptors.CalcMolFormula(mol)
        mol_wt = round(float(Descriptors.MolWt(mol)), 3)
        tpsa = round(float(Descriptors.TPSA(mol)), 2)
        logp = round(float(Descriptors.MolLogP(mol)), 2)
        hbd = int(Descriptors.NumHDonors(mol))
        hba = int(Descriptors.NumHAcceptors(mol))

        found_fgs = []
        for fg_name, smarts in FUNCTIONAL_GROUP_SMARTS:
            try:
                patt = Chem.MolFromSmarts(smarts)
                if patt is not None and mol.HasSubstructMatch(patt):
                    found_fgs.append(fg_name)
            except Exception:
                pass

        if not found_fgs:
            found_fgs.append("Non-functionalized / Unclassified Hydrocarbon or Inorganic")

        return MoleculeAnalysisData(
            name=name,
            smiles=smiles,
            formula=formula,
            molecular_weight=mol_wt,
            tpsa=tpsa,
            logp=logp,
            hbd=hbd,
            hba=hba,
            functional_groups=found_fgs
        )

    @staticmethod
    def run_custom_reaction(request: CustomReactionRequest) -> CustomReactionResponse:
        raw_reactants = request.reactants or []
        if len(raw_reactants) < 2:
            return CustomReactionResponse(
                status="invalid_molecule",
                message="Custom Reaction Lab requires at least two reactant molecules."
            )

        # 1. Name to Structure Resolution & RDKit Sanitization
        resolved_molecules: List[Tuple[str, str, Chem.Mol]] = []
        for raw_item in raw_reactants:
            smiles, err = CustomReactionService.resolve_name_to_smiles(raw_item)
            if err or not smiles:
                return CustomReactionResponse(
                    status="lookup_failure",
                    message=err or f"Failed to identify molecule '{raw_item}'."
                )

            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                return CustomReactionResponse(
                    status="invalid_molecule",
                    message=f"RDKit could not parse the chemical structure for '{raw_item}' (SMILES: {smiles})."
                )

            try:
                Chem.SanitizeMol(mol)
            except Exception as e:
                return CustomReactionResponse(
                    status="invalid_molecule",
                    message=f"Chemical sanitization failed for '{raw_item}': {str(e)}"
                )

            resolved_molecules.append((raw_item, smiles, mol))

        reactants_meta = [{"name": name, "smiles": smi} for name, smi, _ in resolved_molecules]

        # 2. Rule Matching with rdChemReactions
        matched_results = []
        reactant_mols = [m for _, _, m in resolved_molecules]

        # Check candidate rules
        candidate_rules = REACTION_RULES
        if request.selected_rule_id:
            chosen = get_rule_by_id(request.selected_rule_id)
            if chosen:
                candidate_rules = [chosen]

        for rule in candidate_rules:
            smarts_list = [rule["smarts"]]
            if "fallback_smarts" in rule:
                smarts_list.append(rule["fallback_smarts"])

            for cur_smarts in smarts_list:
                try:
                    rxn = AllChem.ReactionFromSmarts(cur_smarts)
                    if rxn is None:
                        continue

                    req_num = rxn.GetNumReactantTemplates()
                    if req_num != len(reactant_mols):
                        continue

                    # Test permutations of reactants
                    for perm in itertools.permutations(reactant_mols):
                        try:
                            prod_sets = rxn.RunReactants(list(perm))
                            if prod_sets:
                                matched_results.append({
                                    "rule": rule,
                                    "reaction_obj": rxn,
                                    "matched_permutation": list(perm),
                                    "product_molecules": prod_sets[0]
                                })
                                break
                        except Exception:
                            continue
                    if matched_results and matched_results[-1]["rule"]["id"] == rule["id"]:
                        break
                except Exception as e:
                    logger.warning(f"Error executing rule {rule['id']}: {e}")

        # 3. Handle Branching based on match count
        if len(matched_results) == 0:
            # No rule matches -> compute properties for each reactant honestly
            analyses = []
            for name, smi, mol in resolved_molecules:
                analyses.append(CustomReactionService.compute_molecule_analysis(mol, name, smi))

            return CustomReactionResponse(
                status="no_supported_rule",
                message="No supported reaction rule matched these reactants under current library constraints.",
                reactants_resolved=reactants_meta,
                molecule_analysis=analyses,
                conditions_reflected=request.conditions
            )

        if len(matched_results) > 1 and not request.selected_rule_id:
            # Multiple rules match -> ask user to choose
            options = []
            seen_ids = set()
            for m in matched_results:
                r_id = m["rule"]["id"]
                if r_id not in seen_ids:
                    seen_ids.add(r_id)
                    options.append(MatchedRuleOption(
                        id=r_id,
                        name=m["rule"]["name"],
                        description=m["rule"]["description"]
                    ))
            return CustomReactionResponse(
                status="multiple_matches",
                message=f"Multiple reaction pathways ({len(options)}) matched the reactants. Please select one to visualize.",
                reactants_resolved=reactants_meta,
                options=options,
                conditions_reflected=request.conditions
            )

        # Exactly 1 match (or user pre-selected one)
        selected = matched_results[0]
        rule = selected["rule"]
        raw_products = selected["product_molecules"]
        matched_perm = selected["matched_permutation"]

        # 4. Sanitize and Deduplicate Products
        sanitized_products = []
        prod_meta = []
        seen_smiles = set()

        for p_mol in raw_products:
            try:
                Chem.SanitizeMol(p_mol)
                smi = Chem.MolToSmiles(p_mol)
                if smi not in seen_smiles:
                    seen_smiles.add(smi)
                    sanitized_products.append(p_mol)
                    prod_meta.append({"name": f"Product ({smi})", "smiles": smi})
            except Exception as e:
                logger.warning(f"Failed to sanitize product: {e}")
                smi = Chem.MolToSmiles(p_mol)
                sanitized_products.append(p_mol)
                prod_meta.append({"name": f"Product ({smi})", "smiles": smi})

        # 5. Extract bonds broken and formed from atom mapping
        bonds_broken: List[BondChange] = []
        bonds_formed: List[BondChange] = []
        mapped_atom_pairs: List[MappedAtomPair] = []

        # Find atom map numbers on product atoms
        # Product atoms carry 'react_idx' and 'react_atom_idx'
        for prod_idx, p_mol in enumerate(sanitized_products):
            for a_idx, atom in enumerate(p_mol.GetAtoms()):
                props = atom.GetPropsAsDict()
                if "react_idx" in props and "react_atom_idx" in props:
                    mapped_atom_pairs.append(MappedAtomPair(
                        reactant_atom_index=int(props["react_atom_idx"]),
                        product_atom_index=a_idx,
                        element=atom.GetSymbol()
                    ))

        # Check bond changes in template
        # We record generic bond changes based on rule description if fine-grained atom bonds differ
        if rule["id"] == "sn2_nucleophilic_substitution":
            bonds_broken.append(BondChange(
                atom1_index=0, atom2_index=1, atom1_element="C", atom2_element="Halogen", order="SINGLE"
            ))
            bonds_formed.append(BondChange(
                atom1_index=0, atom2_index=2, atom1_element="C", atom2_element="Nucleophile", order="SINGLE"
            ))
        elif rule["id"] == "esterification":
            bonds_broken.append(BondChange(
                atom1_index=0, atom2_index=1, atom1_element="C", atom2_element="OH", order="SINGLE"
            ))
            bonds_formed.append(BondChange(
                atom1_index=0, atom2_index=2, atom1_element="C", atom2_element="O-Alkyl", order="SINGLE"
            ))
        elif rule["id"] == "amide_formation":
            bonds_broken.append(BondChange(
                atom1_index=0, atom2_index=1, atom1_element="C", atom2_element="OH", order="SINGLE"
            ))
            bonds_formed.append(BondChange(
                atom1_index=0, atom2_index=2, atom1_element="C", atom2_element="N-Alkyl", order="SINGLE"
            ))
        elif rule["id"] == "alkene_hydration":
            bonds_broken.append(BondChange(
                atom1_index=0, atom2_index=1, atom1_element="C", atom2_element="C", order="DOUBLE"
            ))
            bonds_formed.append(BondChange(
                atom1_index=0, atom2_index=2, atom1_element="C", atom2_element="OH", order="SINGLE"
            ))
        elif rule["id"] == "acid_base_neutralization":
            bonds_broken.append(BondChange(
                atom1_index=0, atom2_index=1, atom1_element="Acid-H", atom2_element="Base-OH", order="IONIC"
            ))
            bonds_formed.append(BondChange(
                atom1_index=0, atom2_index=2, atom1_element="H", atom2_element="O", order="SINGLE"
            ))

        # 6. Generate 3D Coordinates for Reactant State and Product State
        reactant_molecules_3d: List[MoleculeData] = []
        combined_r_atoms: List[AtomData] = []
        combined_r_bonds: List[BondData] = []
        r_atom_offset = 0

        # Layout reactants side-by-side with spatial offset
        for idx, (r_name, r_smi, _) in enumerate(resolved_molecules):
            m_3d = RDKitService.generate_3d_molecule(r_smi, name=r_name)
            if m_3d:
                reactant_molecules_3d.append(m_3d)
                # Offset along X axis for distinct visual separation
                x_shift = (idx - (len(resolved_molecules) - 1) / 2.0) * 4.0
                for a in m_3d.atoms:
                    combined_r_atoms.append(AtomData(
                        index=a.index + r_atom_offset,
                        element=a.element,
                        symbol=a.symbol,
                        atomic_number=a.atomic_number,
                        x=a.x + x_shift,
                        y=a.y,
                        z=a.z,
                        cpk_color=a.cpk_color,
                        charge=a.charge,
                        hybridization=a.hybridization
                    ))
                for b in m_3d.bonds:
                    combined_r_bonds.append(BondData(
                        start_index=b.start_index + r_atom_offset,
                        end_index=b.end_index + r_atom_offset,
                        from_atom=b.from_atom + r_atom_offset,
                        to=b.to + r_atom_offset,
                        order=b.order,
                        bond_order_num=b.bond_order_num,
                        bond_type=b.bond_type
                    ))
                r_atom_offset += len(m_3d.atoms)

        product_molecules_3d: List[MoleculeData] = []
        combined_p_atoms: List[AtomData] = []
        combined_p_bonds: List[BondData] = []
        p_atom_offset = 0

        for idx, p_item in enumerate(prod_meta):
            p_smi = p_item["smiles"]
            p_name = p_item["name"]
            m_3d = RDKitService.generate_3d_molecule(p_smi, name=p_name)
            if m_3d:
                product_molecules_3d.append(m_3d)
                x_shift = (idx - (len(prod_meta) - 1) / 2.0) * 4.0
                for a in m_3d.atoms:
                    combined_p_atoms.append(AtomData(
                        index=a.index + p_atom_offset,
                        element=a.element,
                        symbol=a.symbol,
                        atomic_number=a.atomic_number,
                        x=a.x + x_shift,
                        y=a.y,
                        z=a.z,
                        cpk_color=a.cpk_color,
                        charge=a.charge,
                        hybridization=a.hybridization
                    ))
                for b in m_3d.bonds:
                    combined_p_bonds.append(BondData(
                        start_index=b.start_index + p_atom_offset,
                        end_index=b.end_index + p_atom_offset,
                        from_atom=b.from_atom + p_atom_offset,
                        to=b.to + p_atom_offset,
                        order=b.order,
                        bond_order_num=b.bond_order_num,
                        bond_type=b.bond_type
                    ))
                p_atom_offset += len(m_3d.atoms)

        reactant_state = ReactionState3D(
            name="Reactant State",
            molecules=reactant_molecules_3d,
            combined_atoms=combined_r_atoms,
            combined_bonds=combined_r_bonds
        )

        product_state = ReactionState3D(
            name="Product State",
            molecules=product_molecules_3d,
            combined_atoms=combined_p_atoms,
            combined_bonds=combined_p_bonds
        )

        baseline_ea = rule.get("baseline_ea_kj")

        return CustomReactionResponse(
            status="success",
            message=f"Matched rule: {rule['name']}. Generated 3D geometries and stage narration.",
            matched_rule=MatchedRuleOption(
                id=rule["id"],
                name=rule["name"],
                description=rule["description"]
            ),
            reactants_resolved=reactants_meta,
            products=prod_meta,
            reactant_state=reactant_state,
            product_state=product_state,
            mapped_atom_pairs=mapped_atom_pairs,
            bonds_broken=bonds_broken,
            bonds_formed=bonds_formed,
            narration=rule.get("narration", []),
            conditions_reflected=request.conditions,
            has_activation_energy=baseline_ea is not None,
            baseline_activation_energy_kj=baseline_ea
        )

