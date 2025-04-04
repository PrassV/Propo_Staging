import api from '@/api'; // Import central API client
// Import types from central location
import { RentAgreementFormData, AgreementGenerationResponse } from '@/api/types'; 

export async function generateAgreement(formData: RentAgreementFormData): Promise<AgreementGenerationResponse> {
  try {
    // Call the backend API endpoint for agreement generation
    // Assuming the service exists: api.agreement.generateAgreement
    // Assuming the API returns an object like { agreement: string, ... }
    const response = await api.agreement.generateAgreement(formData); 
    
    // Assuming the response data directly contains the agreement string
    // Adjust if the actual response structure is different (e.g., response.data.agreement)
    if (typeof response?.agreement === 'string') { 
        return { success: true, agreement: response.agreement };
    } else {
        console.error('Invalid response from generateAgreement API:', response);
        throw new Error('API did not return the generated agreement text.');
    }

  } catch (error) {
    console.error('Error generating agreement via API:', error);
    // Rethrow or handle error as needed
    throw error;
  }
}