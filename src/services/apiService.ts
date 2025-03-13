import axios from 'axios';

// Define the API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance for API requests
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// API service for database operations
export const dataService = {
  // Get a record by ID
  async getById(table: string, id: string) {
    try {
      const response = await apiClient.get(`/data/${table}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${table} record:`, error);
      throw error;
    }
  },

  // Create a new record
  async create(table: string, data: Record<string, unknown>) {
    try {
      const response = await apiClient.post(`/data/${table}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error creating ${table} record:`, error);
      throw error;
    }
  },

  // Update a record
  async update(table: string, id: string, data: Record<string, unknown>) {
    try {
      const response = await apiClient.put(`/data/${table}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating ${table} record:`, error);
      throw error;
    }
  },

  // Delete a record
  async delete(table: string, id: string) {
    try {
      const response = await apiClient.delete(`/data/${table}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting ${table} record:`, error);
      throw error;
    }
  },

  // Query table with filters
  async query(table: string, options: {
    select?: string;
    filters?: Array<[string, string, unknown]>;
    order?: [string, string];
    limit?: number;
    offset?: number;
  }) {
    try {
      const response = await apiClient.post(`/data/${table}/query`, options);
      return response.data;
    } catch (error) {
      console.error(`Error querying ${table}:`, error);
      throw error;
    }
  },

  // Batch operations
  async batchOperations(operations: Array<{
    type: 'insert' | 'update' | 'delete';
    table: string;
    data?: Record<string, unknown>;
    filters?: Array<[string, string, unknown]>;
  }>) {
    try {
      const response = await apiClient.post('/data/batch', operations);
      return response.data;
    } catch (error) {
      console.error('Error performing batch operations:', error);
      throw error;
    }
  },

  // Clear cache
  async clearCache(prefix?: string) {
    try {
      const response = await apiClient.post('/data/clear-cache', { prefix });
      return response.data;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
};

// Storage service for file operations
export const storageService = {
  // Verify bucket access
  async verifyBucketAccess(bucketName = 'propertyimage') {
    try {
      const response = await apiClient.get(`/storage/verify-bucket?bucket_name=${bucketName}`);
      return response.data;
    } catch (error) {
      console.error('Error verifying bucket access:', error);
      throw error;
    }
  },

  // Get signed URL for a file
  async getSignedUrl(filePath: string, bucketName = 'propertyimage', expiresIn = 60) {
    try {
      const response = await apiClient.get(
        `/storage/signed-url?file_path=${encodeURIComponent(filePath)}&bucket_name=${bucketName}&expires_in=${expiresIn}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }
  },

  // Get public URL for a file
  async getPublicUrl(filePath: string, bucketName = 'propertyimage') {
    try {
      const response = await apiClient.get(
        `/storage/public-url?file_path=${encodeURIComponent(filePath)}&bucket_name=${bucketName}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting public URL:', error);
      throw error;
    }
  },

  // Upload a file
  async uploadFile(file: File, filePath?: string, bucketName = 'propertyimage') {
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket_name', bucketName);
      
      if (filePath) {
        formData.append('file_path', filePath);
      }

      const response = await apiClient.post('/storage/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Delete files
  async deleteFiles(filePaths: string[], bucketName = 'propertyimage') {
    try {
      const response = await apiClient.delete(
        `/storage/delete?file_paths=${encodeURIComponent(JSON.stringify(filePaths))}&bucket_name=${bucketName}`
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting files:', error);
      throw error;
    }
  }
};

// Export the full API service
const apiService = {
  data: dataService,
  storage: storageService,
};

export default apiService; 