import apiClient from '../client';
import { 
  Agreement, AgreementCreate, AgreementUpdate, AgreementTemplate
  // Add AgreementTemplateCreate, AgreementTemplateUpdate if needed
} from '../types';

// Interface for query parameters for getAgreements
interface GetAgreementsParams {
  property_id?: string;
  tenant_id?: string;
  status?: string;
  agreement_type?: string;
}

// --- Agreements ---

export const getAgreements = async (params: GetAgreementsParams = {}): Promise<Agreement[]> => {
  const response = await apiClient.get<Agreement[]>('/agreements/', { params });
  return response.data;
};

export const getAgreementById = async (id: string): Promise<Agreement> => {
  const response = await apiClient.get<Agreement>(`/agreements/${id}`);
  return response.data;
};

export const createAgreement = async (agreementData: AgreementCreate): Promise<Agreement> => {
  const response = await apiClient.post<Agreement>('/agreements/', agreementData);
  return response.data;
};

export const updateAgreement = async (id: string, agreementData: AgreementUpdate): Promise<Agreement> => {
  const response = await apiClient.put<Agreement>(`/agreements/${id}`, agreementData);
  return response.data;
};

export const deleteAgreement = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/agreements/${id}`);
  return response.data;
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