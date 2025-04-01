import apiClient from '../client';
import { RentEstimationRequest, RentEstimationResponse } from '../types';

/**
 * Estimate rent for a property.
 * @param requestData - The details of the property for estimation.
 * @returns The rent estimation response from the backend.
 */
export const estimateRent = async (requestData: RentEstimationRequest): Promise<RentEstimationResponse> => {
  // Backend endpoint is POST /rent_estimation/
  // It expects RentEstimationRequest in the body and returns RentEstimationResponse directly.
  const response = await apiClient.post<RentEstimationResponse>('/rent_estimation/', requestData);
  return response.data;
}; 