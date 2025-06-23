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

/**
 * Upload property images using clean S3-like pattern
 * Follows the same logic as S3: upload files -> store paths -> generate URLs on demand
 */
export class PropertyImageService {
  
  /**
   * Upload multiple images for a property
   */
  static async uploadImages(
    propertyId: string, 
    files: File[]
  ): Promise<PropertyImageUploadResult> {
    try {
      if (!files.length) {
        throw new Error('No files provided');
      }

      // Validate files before upload
      const validFiles = files.filter(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          return false;
        }
        
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return false;
        }
        
        return true;
      });

      if (!validFiles.length) {
        throw new Error('No valid image files to upload');
      }

      // Create FormData for upload (S3-like multipart upload)
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      // Upload to our clean API endpoint
      const response = await apiClient.post<PropertyImageUploadResult>(
        `/properties/${propertyId}/images/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
      }

      return response.data;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && error.response 
        ? (error.response as any)?.data?.detail || error.message || 'Upload failed'
        : 'Upload failed';
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
   * Get all images for a property with public URLs
   */
  static async getPropertyImages(propertyId: string): Promise<PropertyImageListResult> {
    try {
      const response = await apiClient.get<PropertyImageListResult>(
        `/properties/${propertyId}/images/`
      );

      return response.data;
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch images';
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
        `/properties/${propertyId}/images/${imageIndex}`
      );

      if (response.data.success) {
        toast.success('Image deleted successfully');
        return true;
      }

      return false;
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete image';
      toast.error(errorMessage);
      return false;
    }
  }

  /**
   * Upload a single image for a property
   */
  static async uploadSingleImage(
    propertyId: string, 
    file: File
  ): Promise<PropertyImageUploadResult> {
    return this.uploadImages(propertyId, [file]);
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
export const uploadPropertyImages = PropertyImageService.uploadImages.bind(PropertyImageService);
export const getPropertyImages = PropertyImageService.getPropertyImages.bind(PropertyImageService);
export const deletePropertyImage = PropertyImageService.deleteImage.bind(PropertyImageService);
export const validateImageFile = PropertyImageService.validateImageFile.bind(PropertyImageService);
export const getImageUrl = PropertyImageService.getImageUrlWithFallback.bind(PropertyImageService); 