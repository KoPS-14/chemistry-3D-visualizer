from typing import List, Optional, Union
from pydantic import BaseModel, Field


class ReactantOrProduct(BaseModel):
    name: str
    smiles: str


class ReactionConditions(BaseModel):
    temperature_c: Optional[float] = None
    pressure_atm: Optional[float] = None
    catalyst: Optional[str] = None
    solvent: Optional[str] = None
    concentration: Optional[str] = None


class LLMStructuredOutput(BaseModel):
    request_type: str = Field(..., description="'molecule' or 'reaction'")
    name: Optional[str] = Field(None, description="Name of molecule or reaction")
    smiles: Optional[str] = Field(None, description="SMILES string if molecule request")
    reaction_type: Optional[str] = Field(None, description="Type of reaction if reaction request (e.g. SN2, WaterFormation, AcidBase)")
    reactants: Optional[List[ReactantOrProduct]] = Field(default_factory=list)
    products: Optional[List[ReactantOrProduct]] = Field(default_factory=list)
    conditions: Optional[ReactionConditions] = Field(default_factory=ReactionConditions)
    confidence: float = Field(..., ge=0.0, le=1.0)


class AtomData(BaseModel):
    index: int
    element: str
    symbol: str
    atomic_number: int
    x: float
    y: float
    z: float
    cpk_color: str = "#CCCCCC"
    charge: int = 0
    hybridization: str = "UNSPECIFIED"


class BondData(BaseModel):
    start_index: int
    end_index: int
    from_atom: int = Field(..., alias="from")
    to: int
    order: str = "SINGLE"
    bond_order_num: float = 1.0
    bond_type: str = "SINGLE"

    model_config = {
        "populate_by_name": True
    }


class MoleculeData(BaseModel):
    name: str
    smiles: str
    formula: str
    molecular_weight: float
    atoms: List[AtomData]
    bonds: List[BondData]


class ReactantProduct3DData(BaseModel):
    name: str
    smiles: str
    role: str = Field(..., description="'reactant' or 'product'")
    molecule_data: Optional[MoleculeData] = None


class ReactionData(BaseModel):
    name: str
    reaction_type: str
    description: Optional[str] = None
    balanced_equation: Optional[str] = None
    reactants: List[ReactantProduct3DData]
    products: List[ReactantProduct3DData]
    conditions: Optional[ReactionConditions] = Field(default_factory=ReactionConditions)


class VisualizeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Natural language prompt")


class VisualizeResponse(BaseModel):
    status: str = Field(..., description="'success', 'unsupported', or 'error'")
    request_type: Optional[str] = Field(None, description="'molecule' or 'reaction'")
    data: Optional[Union[MoleculeData, ReactionData, dict]] = None
    explanation: Optional[str] = None
    message: Optional[str] = None
