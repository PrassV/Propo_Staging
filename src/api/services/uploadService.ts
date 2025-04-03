import apiClient from '../client';

// ... interface definition ...

export const uploadFile = async (
  file: File,
  context?: string,
  relatedId?: string
): Promise<string> => {
  // ... formData creation ...
  const formData = new FormData();
  formData.append('file', file);
  if (context) {
    formData.append('context', context);
  }
  if (relatedId) {
    formData.append('related_id', relatedId);
  }

  try {
    // ... apiClient.post call ...
    const response = await apiClient.post<UploadServiceResponse>('/uploads', formData, {
      headers: {
        'Content-Type': undefined, 
      },
    });

    if (response.data && response.data.file_url) {
      return response.data.file_url;
    } else {
      throw new Error('Upload succeeded but no file URL was returned.');
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