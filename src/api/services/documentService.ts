import apiClient from '../client';
import { 
  DocumentCreate, 
  DocumentUpdate, 
  DocumentResponse, 
  DocumentsResponse
} from '../types';

/**
 * Get documents with optional filters like property_id, tenant_id, etc.
 * Calls GET /documents/
 */
export const getDocuments = async (params: {
  property_id?: string;
  tenant_id?: string;
  maintenance_request_id?: string;
  payment_id?: string;
  document_type?: string;
  access_level?: string;
  status?: string;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
} = {}): Promise<DocumentsResponse> => {
  try {
    const response = await apiClient.get<DocumentsResponse>('/documents/', { params });
    return response.data;
  } catch (error: unknown) {
    console.error("Error fetching documents:", error);
    let errorMessage = 'Failed to fetch documents';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Get a specific document by ID.
 * Calls GET /documents/{id}
 */
export const getDocumentById = async (id: string): Promise<DocumentResponse> => {
  try {
    const response = await apiClient.get<DocumentResponse>(`/documents/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error fetching document ${id}:`, error);
    let errorMessage = 'Failed to fetch document';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Create a new document record.
 * Calls POST /documents/
 */
export const createDocument = async (documentData: DocumentCreate): Promise<DocumentResponse> => {
  try {
    const response = await apiClient.post<DocumentResponse>('/documents/', documentData);
    return response.data;
  } catch (error: unknown) {
    console.error("Error creating document:", error);
    let errorMessage = 'Failed to create document';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Update document metadata.
 * Calls PUT /documents/{id}
 */
export const updateDocument = async (id: string, documentData: DocumentUpdate): Promise<DocumentResponse> => {
  try {
    const response = await apiClient.put<DocumentResponse>(`/documents/${id}`, documentData);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error updating document ${id}:`, error);
    let errorMessage = 'Failed to update document';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Delete a document record.
 * Calls DELETE /documents/{id}
 */
export const deleteDocument = async (id: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<{ message: string }>(`/documents/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error deleting document ${id}:`, error);
    let errorMessage = 'Failed to delete document';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

/**
 * Archive a document.
 * Calls PUT /documents/{id}/archive
 */
export const archiveDocument = async (id: string): Promise<DocumentResponse> => {
  try {
    const response = await apiClient.put<DocumentResponse>(`/documents/${id}/archive`);
    return response.data;
  } catch (error: unknown) {
    console.error(`Error archiving document ${id}:`, error);
    let errorMessage = 'Failed to archive document';
    if (error && typeof error === 'object' && 'formattedMessage' in error) {
      errorMessage = (error as { formattedMessage: string }).formattedMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

// TODO: Add functions for versions, sharing, categories if needed based on frontend requirements. 

// --- ADD Placeholder Functions (if they weren't added before) ---
// Example: If getDocuments above didn't match exactly what we needed earlier 
// (This might be redundant now, but ensures placeholders exist if needed)

// Placeholder Get Documents (Can be removed if above getDocuments is sufficient)
// export const getDocuments_placeholder = async (params?: { property_id?: string; tenant_id?: string; }): Promise<DocumentsResponse> => {
//     console.log("API CALL: getDocuments (Placeholder) - Params:", params);
//     // ... mock logic ... 
// };

// Placeholder Delete Document (Can be removed if above deleteDocument is sufficient)
// export const deleteDocument_placeholder = async (documentId: string): Promise<void> => {
//     console.log(`API CALL: deleteDocument (Placeholder) - ID: ${documentId}`);
//     // ... mock logic ...
// }; 