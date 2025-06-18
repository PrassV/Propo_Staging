import apiClient from '../client';
import { 
  Agreement, AgreementCreate, AgreementUpdate, AgreementTemplate, PaginatedResponse, RentAgreementFormData, AgreementGenerationResponse
  // Add AgreementTemplateCreate, AgreementTemplateUpdate if needed
} from '../types';
import { ApiResponse } from '../types'; // Import ApiResponse if not already present

// Interface for query parameters for getAgreements
interface GetAgreementsParams {
  property_id?: string;
  tenant_id?: string;
  status?: string;
  agreement_type?: string;
}

// --- Agreements ---

export const getAgreements = async (params: Record<string, any> = {}): Promise<PaginatedResponse<Agreement>> => {
  const response = await apiClient.get<PaginatedResponse<Agreement>>('/agreements', { params });
  return response.data;
};

export const getAgreementById = async (id: string): Promise<Agreement> => {
  const response = await apiClient.get<ApiResponse<Agreement>>(`/agreements/${id}`);
  return response.data.data;
};

export const createAgreement = async (agreementData: AgreementCreate): Promise<Agreement> => {
  const response = await apiClient.post<ApiResponse<Agreement>>('/agreements', agreementData);
  return response.data.data;
};

export const updateAgreement = async (id: string, updateData: AgreementUpdate): Promise<Agreement> => {
  const response = await apiClient.put<ApiResponse<Agreement>>(`/agreements/${id}`, updateData);
  return response.data.data;
};

export const deleteAgreement = async (id: string): Promise<void> => {
  await apiClient.delete(`/agreements/${id}`);
};

export const generateAgreement = async (formData: RentAgreementFormData): Promise<AgreementGenerationResponse> => {
    console.log("Calling generateAgreement API with data:", formData);
    // TODO: Replace with actual API call to your backend endpoint
    // Example: 
    // const response = await apiClient.post<AgreementGenerationResponse>('/agreements/generate-text', formData);
    // return response.data;

    // --- Placeholder Implementation --- 
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    const placeholderText = `
## RENT AGREEMENT (Placeholder)

**Property:** ${formData.propertyAddress || '[Not Specified]'}
**Tenant:** ${formData.tenantName || '[Not Specified]'}
**Landlord:** ${formData.landlordName || '[Not Specified]'}

**Rent:** ₹{formData.monthlyRent || '[N/A]'} per month
**Start Date:** ${formData.startDate || '[N/A]'}
**Duration:** ${formData.leaseDuration || '[N/A]'} months

--- THIS IS A PLACEHOLDER DOCUMENT ---
Replace this with the actual generated agreement content from your backend.
`;
    // Return the expected structure, even for placeholder
    return { agreement: placeholderText, success: true }; 
    // --- End Placeholder --- 
};

export const generateAgreementDocument = async (id: string, templateId?: string): Promise<Agreement> => {
  const params = templateId ? { template_id: templateId } : {};
  const response = await apiClient.post<Agreement>(`/agreements/${id}/generate`, null, { params });
  return response.data;
};

export const updateAgreementStatus = async (id: string, status: string, signedUrl?: string): Promise<Agreement> => {
  const params: { status: string; signed_url?: string } = { status };
  if (signedUrl) params.signed_url = signedUrl;
  const response = await apiClient.put<Agreement>(`/agreements/${id}/status`, null, { params });
  return response.data;
};

export const getCurrentAgreement = async (propertyId: string, tenantId: string): Promise<Agreement | null> => {
  const params = { property_id: propertyId, tenant_id: tenantId };
  // Backend returns Optional[Agreement], so handle potential null
  const response = await apiClient.get<Agreement | null>('/agreements/current', { params });
  return response.data;
};

// --- Agreement Templates ---

export const getAgreementTemplates = async (agreementType?: string): Promise<AgreementTemplate[]> => {
  const params = agreementType ? { agreement_type: agreementType } : {};
  const response = await apiClient.get<AgreementTemplate[]>('/agreements/templates', { params });
  return response.data;
};

export const getAgreementTemplateById = async (id: string): Promise<AgreementTemplate> => {
  const response = await apiClient.get<AgreementTemplate>(`/agreements/templates/${id}`);
  return response.data;
};

// TODO: Define AgreementTemplateCreate type if possible
export const createAgreementTemplate = async (templateData: Record<string, unknown>): Promise<AgreementTemplate> => {
  const response = await apiClient.post<AgreementTemplate>('/agreements/templates', templateData);
  return response.data;
};

// TODO: Define AgreementTemplateUpdate type if possible
export const updateAgreementTemplate = async (id: string, templateData: Record<string, unknown>): Promise<AgreementTemplate> => {
  const response = await apiClient.put<AgreementTemplate>(`/agreements/templates/${id}`, templateData);
  return response.data;
};

export const deleteAgreementTemplate = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/agreements/templates/${id}`);
  return response.data;
};

export const signAgreement = async (id: string, signatureData: any): Promise<Agreement> => {
  const response = await apiClient.post<ApiResponse<Agreement>>(`/agreements/${id}/sign`, signatureData);
  return response.data.data;
}; 