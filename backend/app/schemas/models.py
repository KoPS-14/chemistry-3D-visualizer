from typing import List, Optional, Union
from pydantic import BaseModel, Field


class ElementData(BaseModel):
    atomic_number: int
    symbol: str
    name: str
    atomic_mass: Optional[float] = None
    group: Optional[int] = None
    period: Optional[int] = None
    category: str = "unknown"
    electron_configuration: Optional[str] = ""
    shells: List[int] = Field(default_factory=list)
    cpk: str = "#CCCCCC"
    summary: Optional[str] = ""


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
    stages: Optional[List[str]] = Field(default_factory=list)
    animation_template: Optional[dict] = None


class VisualizeRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Natural language prompt")


class VisualizeResponse(BaseModel):
    status: str = Field(..., description="'success', 'unsupported', or 'error'")
    request_type: Optional[str] = Field(None, description="'molecule' or 'reaction'")
    data: Optional[Union[MoleculeData, ReactionData, dict]] = None
    explanation: Optional[str] = None
    message: Optional[str] = None


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', 'model', or 'system'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question or prompt")
    history: Optional[List[ChatMessage]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    status: str = Field(..., description="'success' or 'error'")
    answer: str
    reply: str
    suggested_visualize_prompt: Optional[str] = None
    error: Optional[str] = None


class KineticsRequest(BaseModel):
    reaction_type: str = Field(..., description="Type of the reaction (e.g., SN2, Addition, etc.)")
    conditions: ReactionConditions = Field(default_factory=ReactionConditions)


class KineticsResponse(BaseModel):
    status: str = Field(..., description="'success' or 'error'")
    temperature_c: Optional[float] = 25.0
    temperature_k: Optional[float] = 298.15
    pressure_atm: Optional[float] = 1.0
    catalyst: Optional[str] = "none"
    solvent: Optional[str] = "aqueous"
    concentration_m: Optional[float] = 1.0
    baseline_activation_energy_kj: Optional[float] = 70.0
    effective_activation_energy_kj: Optional[float] = 70.0
    catalyst_reduction_kj: Optional[float] = 0.0
    relative_rate_multiplier: Optional[float] = 1.0
    simulation_speed_factor: Optional[float] = 1.0
    rate_impact: str = Field(..., description="Educational explanation of how conditions affect reaction rate")
    activation_energy_impact: str = Field(..., description="Educational explanation of how conditions affect activation energy")
    le_chatelier_shift: Optional[str] = ""
    educational_insight: str = Field(..., description="Summary educational insight based on conditions")


class ElementExplainRequest(BaseModel):
    atomic_number: int
    symbol: str
    name: str
    category: Optional[str] = "unknown"
    group: Optional[Union[int, str]] = None
    period: Optional[Union[int, str]] = None
    electron_configuration: Optional[str] = ""
    atomic_mass: Optional[Union[float, str]] = None
    summary: Optional[str] = ""

    model_config = {
        "extra": "ignore"
    }


class ElementExplainResponse(BaseModel):
    status: str = Field(..., description="'success' or 'error'")
    element_name: str
    symbol: str
    atomic_number: int
    explanation: str


class ReactionExplainRequest(BaseModel):
    name: str
    reaction_type: str
    balanced_equation: Optional[str] = None
    conditions: Optional[Union[ReactionConditions, dict]] = None
    kinetics: Optional[dict] = None
    is_interrupted: Optional[bool] = False

    model_config = {
        "extra": "ignore"
    }


class ReactionExplainResponse(BaseModel):
    status: str = Field(..., description="'success' or 'error'")
    reaction_name: str
    reaction_type: str
    explanation: str
    is_interrupted: bool = False




