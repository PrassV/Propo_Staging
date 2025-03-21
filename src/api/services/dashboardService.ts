import apiClient from '../client';
import { ApiResponse, DashboardData, DashboardSummary } from '../types';

// Get dashboard summary
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
  return response.data.data;
};

// Get complete dashboard data with optional parameter for number of months of history
export const getDashboardData = async (months: number = 6): Promise<DashboardData> => {
  const response = await apiClient.get<ApiResponse<DashboardData>>('/dashboard/data', {
    params: { months }
  });
  return response.data.data;
}; 