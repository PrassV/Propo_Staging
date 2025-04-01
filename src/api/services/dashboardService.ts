import apiClient from '../client';
import { DashboardData, DashboardSummary } from '../types';

// Get dashboard summary - Backend returns summary object directly
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
  // Return data directly
  return response.data;
};

// Backend response type for /data endpoint
interface DashboardDataResponse {
  data: DashboardData;
  message: string;
}

// Get complete dashboard data - Backend returns { data: ..., message: ... }
export const getDashboardData = async (months: number = 6): Promise<DashboardData> => {
  const response = await apiClient.get<DashboardDataResponse>('/dashboard/data', {
    params: { months }
  });
  // Return data from the nested 'data' key
  return response.data.data;
}; 