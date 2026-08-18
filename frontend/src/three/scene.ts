import type { ElementRenderConfig } from '../types/reaction';

export const ELEMENT_CONFIGS: Record<string, ElementRenderConfig> = {
  H: { color: '#FFFFFF', radius: 0.28, name: 'Hydrogen' },
  C: { color: '#909090', radius: 0.48, name: 'Carbon' },
  N: { color: '#3050F8', radius: 0.45, name: 'Nitrogen' },
  O: { color: '#FF0D0D', radius: 0.42, name: 'Oxygen' },
  F: { color: '#90E050', radius: 0.40, name: 'Fluorine' },
  Na: { color: '#AB5CF2', radius: 0.65, name: 'Sodium' },
  P: { color: '#FF8000', radius: 0.55, name: 'Phosphorus' },
  S: { color: '#FFFF30', radius: 0.55, name: 'Sulfur' },
  Cl: { color: '#1FF01F', radius: 0.52, name: 'Chlorine' },
  Br: { color: '#A62929', radius: 0.58, name: 'Bromine' },
  I: { color: '#940094', radius: 0.62, name: 'Iodine' },
};

export const DEFAULT_ELEMENT_CONFIG: ElementRenderConfig = {
  color: '#CCCCCC',
  radius: 0.45,
  name: 'Unknown Element',
};

export const getElementConfig = (elementSymbol: string, customCpk?: string): ElementRenderConfig => {
  const sym = elementSymbol.trim();
  const base = ELEMENT_CONFIGS[sym] || { ...DEFAULT_ELEMENT_CONFIG, name: sym };
  if (customCpk) {
    return { ...base, color: customCpk };
  }
  return base;
};
