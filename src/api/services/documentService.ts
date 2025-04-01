import apiClient from '../client';
import { 
  Document, // Import Document directly now
  DocumentCreate, 
  DocumentUpdate, 
  DocumentResponse, 
  DocumentsResponse
} from '../../types/document'; // Correct path

// Interface for query parameters for getDocuments
interface GetDocumentsParams {
  property_id?: string;
  tenant_id?: string;
  document_type?: string;
  status?: string;
  // Add other potential filters like tags, date range etc.
}

/**
 * Get documents based on filters.
 */
export const getDocuments = async (params: GetDocumentsParams = {}): Promise<DocumentsResponse> => {
  const response = await apiClient.get<DocumentsResponse>('/documents/', { params });
  // Backend returns { documents: [], count: N, message: "..." }
  return response.data;
};

/**
 * Get a specific document by ID.
 */
export const getDocumentById = async (id: string): Promise<DocumentResponse> => {
  const response = await apiClient.get<DocumentResponse>(`/documents/${id}`);
  // Backend returns { document: {...}, message: "..." }
  return response.data;
};

/**
 * Create a new document record (linking an uploaded file).
 */
export const createDocument = async (documentData: DocumentCreate): Promise<DocumentResponse> => {
  const response = await apiClient.post<DocumentResponse>('/documents/', documentData);
  // Backend returns { document: {...}, message: "..." }
  return response.data;
};

/**
 * Update document metadata.
 */
export const updateDocument = async (id: string, documentData: DocumentUpdate): Promise<DocumentResponse> => {
  const response = await apiClient.put<DocumentResponse>(`/documents/${id}`, documentData);
  // Backend returns { document: {...}, message: "..." }
  return response.data;
};

/**
 * Delete a document record.
 */
export const deleteDocument = async (id: string): Promise<{ message: string }> => {
  // Backend returns { message: "..." } with 200 OK
  const response = await apiClient.delete<{ message: string }>(`/documents/${id}`);
  return response.data;
};

/**
 * Archive a document.
 */
export const archiveDocument = async (id: string): Promise<DocumentResponse> => {
  const response = await apiClient.put<DocumentResponse>(`/documents/${id}/archive`);
  // Backend returns { document: {...}, message: "..." }
  return response.data;
};

// TODO: Add functions for versions, sharing, categories if needed based on frontend requirements. 