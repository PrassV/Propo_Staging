import apiClient from '../client';

// Interface for the upload service response
interface UploadServiceResponse {
  success: boolean;
  uploaded_paths: string[];
  image_urls: string[];
  message: string;
  file_paths: string[]; // Backward compatibility
  file_url?: string; // For single file uploads
}

// Interface for additional upload metadata
interface UploadMetadata {
  property_id?: string;
  tenant_id?: string;
}

export const uploadFile = async (
  file: File,
  context?: string,
  relatedId?: string,
  metadata?: UploadMetadata
): Promise<string> => {
  const formData = new FormData();
  // Fix: Use 'files' (plural) to match backend expectation
  formData.append('files', file);
  if (context) {
    formData.append('context', context);
  }
  if (relatedId) {
    formData.append('related_id', relatedId);
  }
  
  // Add additional metadata if provided
  if (metadata?.property_id) {
    formData.append('property_id', metadata.property_id);
  }
  if (metadata?.tenant_id) {
    formData.append('tenant_id', metadata.tenant_id);
  }

  try {
    // Fix: Use correct endpoint path with trailing slash
    const response = await apiClient.post<UploadServiceResponse>('/uploads/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', 
      },
    });

    // Handle the updated response format
    if (response.data && response.data.success) {
      // For single file uploads, return the first URL
      if (response.data.image_urls && response.data.image_urls.length > 0) {
        return response.data.image_urls[0];
      } else if (response.data.file_url) {
        return response.data.file_url;
      } else {
        throw new Error('Upload succeeded but no file URL was returned.');
      }
    } else {
      throw new Error(response.data?.message || 'Upload failed.');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Default error message
    let errorMessage = 'File upload failed';
    
    // Check if it looks like an HTTP error response
    if (error && typeof error === 'object' && 'response' in error && 
        error.response && typeof error.response === 'object' && 'data' in error.response &&
        error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
         // Type assertion is okay here after checks
         errorMessage = (error.response.data as { detail: string }).detail; 
    } else if (error instanceof Error) {
         errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};