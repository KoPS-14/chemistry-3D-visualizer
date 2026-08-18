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

export interface ReactionData {
  name: string;
  reaction_type: string;
  description?: string;
  balanced_equation?: string;
  reactants: ReactantProduct3DData[];
  products: ReactantProduct3DData[];
  conditions?: ReactionConditions;
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
