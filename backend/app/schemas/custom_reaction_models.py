from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.schemas.models import MoleculeData, ReactionConditions, AtomData, BondData


class CustomReactionRequest(BaseModel):
    reactants: List[str] = Field(..., min_length=1, description="List of reactant chemical names or SMILES")
    conditions: Optional[ReactionConditions] = Field(default_factory=ReactionConditions)
    selected_rule_id: Optional[str] = Field(None, description="Optional rule ID if user chose from multiple matches")


class MatchedRuleOption(BaseModel):
    id: str
    name: str
    description: str


class MappedAtomPair(BaseModel):
    reactant_atom_index: int
    product_atom_index: int
    element: str


class BondChange(BaseModel):
    atom1_index: int
    atom2_index: int
    atom1_element: str
    atom2_element: str
    order: str = "SINGLE"


class ReactionState3D(BaseModel):
    name: str
    molecules: List[MoleculeData]
    combined_atoms: List[AtomData]
    combined_bonds: List[BondData]


class MoleculeAnalysisData(BaseModel):
    name: str
    smiles: str
    formula: str
    molecular_weight: float
    tpsa: float
    logp: float
    hbd: int
    hba: int
    functional_groups: List[str]


class CustomReactionResponse(BaseModel):
    status: str = Field(..., description="'success', 'multiple_matches', 'no_supported_rule', 'invalid_molecule', 'lookup_failure'")
    message: str
    matched_rule: Optional[MatchedRuleOption] = None
    options: Optional[List[MatchedRuleOption]] = None
    reactants_resolved: Optional[List[Dict[str, str]]] = None
    products: Optional[List[Dict[str, str]]] = None
    reactant_state: Optional[ReactionState3D] = None
    product_state: Optional[ReactionState3D] = None
    mapped_atom_pairs: Optional[List[MappedAtomPair]] = None
    bonds_broken: Optional[List[BondChange]] = None
    bonds_formed: Optional[List[BondChange]] = None
    narration: Optional[List[str]] = None
    molecule_analysis: Optional[List[MoleculeAnalysisData]] = None
    conditions_reflected: Optional[ReactionConditions] = None
    has_activation_energy: bool = False
    baseline_activation_energy_kj: Optional[float] = None

