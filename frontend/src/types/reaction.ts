export interface ElementData {
  atomic_number: number;
  symbol: string;
  name: string;
  atomic_mass?: number | null;
  group?: number | null;
  period?: number | null;
  category: string;
  electron_configuration?: string;
  shells: number[];
  cpk: string;
  summary?: string;
}

export interface AtomData {
  index: number;
  element: string;
  symbol?: string;
  atomic_number?: number;
  x: number;
  y: number;
  z: number;
  cpk_color?: string;
  charge?: number;
  hybridization?: string;
}

export interface BondData {
  start_index?: number;
  end_index?: number;
  from?: number;
  to?: number;
  order: string | number;
  bond_type?: string;
}

export interface MoleculeData {
  name: string;
  smiles: string;
  formula: string;
  molecular_weight: number;
  atoms: AtomData[];
  bonds: BondData[];
}

export interface ReactantProduct3DData {
  name: string;
  smiles: string;
  role: 'reactant' | 'product';
  molecule_data: MoleculeData;
}

export interface ReactionConditions {
  temperature_c?: number | null;
  pressure_atm?: number | null;
  catalyst?: string | null;
  solvent?: string | null;
  concentration?: string | null;
}

export interface ReactionKeyframe {
  progress: number;
  stage_name: string;
  description: string;
  reactant_offset: [number, number, number];
  product_offset: [number, number, number];
  bond_stretch: number;
  transition_state_active: boolean;
}

export interface ReactionAnimationData {
  class_name: string;
  stages: string[];
  keyframes: ReactionKeyframe[];
}

export interface ReactionData {
  name: string;
  reaction_type: string;
  description?: string;
  balanced_equation?: string;
  reactants: ReactantProduct3DData[];
  products: ReactantProduct3DData[];
  conditions?: ReactionConditions;
  stages?: string[];
  animation_template?: ReactionAnimationData;
}

export interface VisualizeResponse {
  status: 'success' | 'unsupported' | 'error';
  request_type?: 'molecule' | 'reaction';
  data?: MoleculeData | ReactionData;
  explanation?: string;
  message?: string;
}

export interface ElementRenderConfig {
  color: string;
  radius: number;
  name: string;
}

export interface KineticsEvaluationResult {
  status: 'success' | 'error';
  temperature_c?: number;
  temperature_k?: number;
  pressure_atm?: number;
  catalyst?: string;
  solvent?: string;
  concentration_m?: number;
  baseline_activation_energy_kj?: number;
  effective_activation_energy_kj?: number;
  catalyst_reduction_kj?: number;
  relative_rate_multiplier?: number;
  simulation_speed_factor?: number;
  rate_impact: string;
  activation_energy_impact: string;
  le_chatelier_shift?: string;
  educational_insight: string;
}

export interface ElementExplainResponse {
  status: 'success' | 'error';
  element_name: string;
  symbol: string;
  atomic_number: number;
  explanation: string;
}

export interface ReactionExplainResponse {
  status: 'success' | 'error';
  reaction_name: string;
  reaction_type: string;
  explanation: string;
  is_interrupted?: boolean;
}


