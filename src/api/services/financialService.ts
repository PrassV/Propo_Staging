import apiClient from '../client';
import { FinancialSummary } from '../types';

/**
 * Get financial summary for a property
 * Calls GET /properties/{propertyId}/financial-summary
 */
export const getFinancialSummary = async (
  propertyId: string,
  period: 'month' | 'quarter' | 'year' = 'month'
): Promise<FinancialSummary> => {
  try {
    const response = await apiClient.get<FinancialSummary>(
      `/properties/${propertyId}/financial-summary`,
      { params: { period } }
    );
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching financial summary for property ${propertyId}:`, error);
    let errorMessage = 'Failed to fetch financial summary';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}; 