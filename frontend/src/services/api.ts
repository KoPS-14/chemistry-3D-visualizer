import axios from 'axios';
import type { VisualizeResponse, ElementData, ReactionConditions, KineticsEvaluationResult } from '../types/reaction';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export const evaluateKinetics = async (
  reactionType: string,
  conditions: ReactionConditions
): Promise<KineticsEvaluationResult | null> => {
  try {
    const response = await apiClient.post<KineticsEvaluationResult>('/kinetics', {
      reaction_type: reactionType,
      conditions,
    });
    return response.data;
  } catch (error) {
    console.error('Failed to evaluate kinetics:', error);
    return null;
  }
};

export const visualizeChemistry = async (prompt: string): Promise<VisualizeResponse> => {
  try {
    const response = await apiClient.post<VisualizeResponse>('/visualize', { prompt });
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          status: 'error',
          message: 'Backend server timed out while generating 3D structure.',
        };
      }
      if (!error.response) {
        return {
          status: 'error',
          message: 'Backend server is currently unavailable. Ensure FastAPI is running at http://localhost:8000.',
        };
      }
      return {
        status: 'error',
        message: error.response.data?.detail || 'An error occurred while processing request.',
      };
    }
    return {
      status: 'error',
      message: 'Unexpected network error occurred.',
    };
  }
};

export const fetchAllElements = async (): Promise<ElementData[]> => {
  try {
    const res = await apiClient.get<ElementData[]>('/elements');
    return res.data;
  } catch (error) {
    console.error('Failed to fetch elements:', error);
    return [];
  }
};

export const fetchElementByNumber = async (atomicNumber: number): Promise<ElementData | null> => {
  try {
    const res = await apiClient.get<ElementData>(`/elements/${atomicNumber}`);
    return res.data;
  } catch (error) {
    console.error(`Failed to fetch element ${atomicNumber}:`, error);
    return null;
  }
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get('/health');
    return res.data?.status === 'ok';
  } catch {
    return false;
  }
};

export const fetchElementExplanation = async (element: ElementData): Promise<string> => {
  try {
    const res = await apiClient.post<{ status: string; explanation: string }>('/explain/element', element);
    if (res.data?.explanation && res.data.explanation.trim().length > 0) {
      return res.data.explanation;
    }
  } catch (error) {
    console.error('Failed to fetch element explanation:', error);
  }

  const shellStr = element.shells?.join(', ') || 'N/A';
  return [
    `### ⚛️ Atomic & Electron Structure of ${element.name} (${element.symbol})`,
    `- **Atomic Number**: #${element.atomic_number} (${element.atomic_number} protons & electrons)`,
    `- **Atomic Mass**: ${element.atomic_mass ? `${element.atomic_mass} u` : 'N/A'}`,
    `- **Classification**: ${element.category.toUpperCase()} (Group ${element.group ?? 'N/A'}, Period ${element.period ?? 'N/A'})`,
    `- **Electron Configuration**: \`${element.electron_configuration || 'N/A'}\``,
    `- **Shell Distribution**: ${shellStr}`,
    ``,
    `### 🧪 Reactivity & Periodic Trends`,
    `${element.name} (${element.symbol}) is a representative ${element.category} in Group ${element.group ?? 'N/A'}, Period ${element.period ?? 'N/A'}. Its valence electron configuration governs its chemical bonding, oxidation states, and ionization energy trends across the periodic table.`,
    ``,
    `### 🌍 Real-World & Industrial Significance`,
    `${element.summary || `${element.name} plays a unique role in inorganic synthesis, material science, and chemical research.`}`,
    ``,
    `### 💡 Key Chemical Insight`,
    `Understanding the electronic shell layout (${shellStr}) of ${element.name} provides direct insight into how it forms chemical bonds and reacts with other reagents.`
  ].join('\n');
};

export const fetchReactionExplanation = async (
  name: string,
  reactionType: string,
  balancedEquation?: string,
  conditions?: ReactionConditions,
  kinetics?: KineticsEvaluationResult | null,
  isInterrupted: boolean = false
): Promise<string> => {
  try {
    const res = await apiClient.post<{ status: string; explanation: string }>('/explain/reaction', {
      name,
      reaction_type: reactionType,
      balanced_equation: balancedEquation,
      conditions,
      kinetics,
      is_interrupted: isInterrupted,
    });
    if (res.data?.explanation && res.data.explanation.trim().length > 0) {
      return res.data.explanation;
    }
  } catch (error) {
    console.error('Failed to fetch reaction explanation:', error);
  }

  const temp = conditions?.temperature_c ?? 25;
  const press = conditions?.pressure_atm ?? 1.0;
  const cat = conditions?.catalyst || 'none';
  const solv = conditions?.solvent || 'aqueous';
  const rate = kinetics?.relative_rate_multiplier ?? 1.0;
  const ea = kinetics?.effective_activation_energy_kj ?? 70.0;

  const interruptedHeader = isInterrupted
    ? '⚠️ **Reaction Interrupted / Modified**: Custom parameters are currently active.'
    : 'Reaction running under standard operating conditions.';

  const catText = cat !== 'none'
    ? `Active catalyst **${cat}** lowers the activation energy barrier Ea to **${ea} kJ/mol**.`
    : `Standard thermal activation barrier Ea = **${ea} kJ/mol** (uncatalyzed).`;

  return [
    `### ⚗️ Reaction Overview: ${name}`,
    `- **Type**: \`${reactionType}\``,
    `- **Equation**: \`${balancedEquation || 'Reactants → Products'}\``,
    ``,
    `### ⚡ Energetics & Activation Energy (Ea)`,
    `- **Effective Activation Energy (Ea)**: ${ea} kJ/mol`,
    `- **Relative Rate Constant (k)**: ${rate}x relative to 25°C standard state.`,
    `${catText}`,
    ``,
    `### 🎛️ Condition Impact & Interruption Analysis`,
    `${interruptedHeader}`,
    `At **${temp}°C** (${(temp + 273.15).toFixed(1)} K) and **${press} atm** in \`${solv}\` medium, molecular kinetic energy produces a relative rate factor of **${rate}x**.`,
    ``,
    `### 🏭 Industrial & Practical Applications`,
    `Modulating temperature, pressure, and catalyst presence enables precise control over reaction rate, transition state lifetime, and chemical yield.`
  ].join('\n');
};



