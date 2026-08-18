import axios from 'axios';
import type { VisualizeResponse } from '../types/reaction';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

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

export const checkHealth = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get('/health');
    return res.data?.status === 'ok';
  } catch {
    return false;
  }
};
