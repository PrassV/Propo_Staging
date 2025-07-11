import apiClient from '../../api/client';
import toast from 'react-hot-toast';

export interface PropertyImageUploadResult {
  success: boolean;
  message: string;
  uploaded_paths: string[];
  image_urls: string[];
  failed_files: string[];
}

export interface PropertyImageListResult {
  property_id: string;
  image_urls: string[];
  total_images: number;
}

interface ImageValidation {
  valid: boolean;
  error?: string;
}

interface PropertyImageData {
  id: string;
  image_urls: string[];
  total_images: number;
}

/**
 * Upload property images using unified storage system
 * Uses the centralized storageService for consistent behavior
 */
export class PropertyImageService {
  
  /**
   * Upload multiple images for a property using unified storage
   */
  static async uploadImages(
    propertyId: string, 
    files: File[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string  // Keep for backward compatibility but won't be used
  ): Promise<PropertyImageUploadResult> {
    try {
      if (!files.length) {
        throw new Error('No files provided');
      }

      const validFiles: File[] = [];
      const failedFiles: string[] = [];

      // Validate files before upload
      files.forEach(file => {
        const validation = this.validateImageFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          toast.error(validation.error || `${file.name} is invalid`);
          failedFiles.push(file.name);
        }
      });

      if (!validFiles.length) {
        throw new Error('No valid image files to upload');
      }

      // Use backend API upload endpoint instead of direct Supabase upload
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('context', 'property_images');
      formData.append('property_id', propertyId);

      const response = await apiClient.post('/uploads/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        const uploadedPaths = response.data.uploaded_paths || [];
        const imageUrls = response.data.image_urls || [];

        return {
          success: true,
          message: `Successfully uploaded ${uploadedPaths.length} images`,
          uploaded_paths: uploadedPaths,
          image_urls: imageUrls,
          failed_files: failedFiles
        };
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }

    } catch (error: unknown) {
      console.error('Upload error:', error);
      let errorMessage = 'Upload failed';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string } } };
        if (axiosError.response?.data?.detail) {
          errorMessage = axiosError.response.data.detail;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
        uploaded_paths: [],
        image_urls: [],
        failed_files: files.map(f => f.name)
      };
    }
  }

  /**
   * Update property record with image paths
   */
  private static async updatePropertyImages(propertyId: string, imagePaths: string[]): Promise<void> {
    try {
      await apiClient.patch(`/api/v1/properties/${propertyId}/images`, {
        image_paths: imagePaths,
        action: 'add'
      });
    } catch (error) {
      console.error('Failed to update property images:', error);
      throw error;
    }
  }

  /**
   * Get all images for a property with public URLs
   */
  static async getPropertyImages(propertyId: string): Promise<PropertyImageListResult> {
    try {
      const response = await apiClient.get<PropertyImageListResult>(
        `/api/v1/properties/${propertyId}/images/`
      );

      return response.data;
      
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error && error.response && 
        typeof error.response === 'object' && 'data' in error.response && error.response.data &&
        typeof error.response.data === 'object' && 'detail' in error.response.data
        ? (error.response.data as { detail: string }).detail
        : error instanceof Error ? error.message : 'Failed to fetch images';
      console.error('Error fetching property images:', errorMessage);
      
      return {
        property_id: propertyId,
        image_urls: [],
        total_images: 0
      };
    }
  }

  /**
   * Delete a specific property image by index
   */
  static async deleteImage(propertyId: string, imageIndex: number): Promise<boolean> {
    try {
      const response = await apiClient.delete(
        `/api/v1/properties/${propertyId}/images/${imageIndex}`
      );

      if (response.data.success) {
        toast.success('Image deleted successfully');
        return true;
      }

      return false;
      
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error && error.response && 
        typeof error.response === 'object' && 'data' in error.response && error.response.data &&
        typeof error.response.data === 'object' && 'detail' in error.response.data
        ? (error.response.data as { detail: string }).detail
        : error instanceof Error ? error.message : 'Failed to delete image';
      toast.error(errorMessage);
      return false;
    }
  }

  /**
   * Upload a single image for a property
   */
  static async uploadSingleImage(
    propertyId: string, 
    file: File,
    userId: string
  ): Promise<PropertyImageUploadResult> {
    return this.uploadImages(propertyId, [file], userId);
  }

  /**
   * Validate image file (client-side validation)
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: `${file.name} is not an image file` };
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: `${file.name} is too large (max 10MB)` };
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return { valid: false, error: `${file.name} has unsupported format` };
    }

    return { valid: true };
  }

  /**
   * Get default image URL for fallback
   */
  static getDefaultImageUrl(): string {
    return "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80";
  }

  /**
   * Get image URL with fallback (S3-like pattern)
   */
  static getImageUrlWithFallback(imageUrl?: string): string {
    if (!imageUrl || imageUrl.trim() === '') {
      return this.getDefaultImageUrl();
    }

    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Otherwise, treat as path and let the API handle URL generation
    return imageUrl;
  }
}

// Export convenience functions for backward compatibility
export const uploadPropertyImages = (propertyId: string, files: File[], userId: string) => 
  PropertyImageService.uploadImages(propertyId, files, userId);
export const getPropertyImages = PropertyImageService.getPropertyImages.bind(PropertyImageService);
export const deletePropertyImage = PropertyImageService.deleteImage.bind(PropertyImageService);
export const validateImageFile = PropertyImageService.validateImageFile.bind(PropertyImageService);
export const getImageUrl = PropertyImageService.getImageUrlWithFallback.bind(PropertyImageService); 