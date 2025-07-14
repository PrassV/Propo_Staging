import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// Storage configuration for different contexts
const STORAGE_CONFIG = {
  'property_images': {
    bucket: 'propertyimage',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
  },
  'tenant_documents': {
    bucket: 'tenant-documents',
    maxSize: 25 * 1024 * 1024, // 25MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  'maintenance_files': {
    bucket: 'maintenance-files',
    maxSize: 15 * 1024 * 1024, // 15MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg']
  },
  'agreements': {
    bucket: 'agreements',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['application/pdf']
  },
  'id_documents': {
    bucket: 'id-documents',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg']
  },
  'documents': {
    bucket: 'tenant-documents', // Default mapping for 'documents' context
    maxSize: 25 * 1024 * 1024,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
} as const;

export type StorageContext = keyof typeof STORAGE_CONFIG;

// Type guard function
function isValidStorageContext(context: string): context is StorageContext {
  return context in STORAGE_CONFIG;
}

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  error?: string;
}

export interface StorageMetadata {
  userId?: string;
  propertyId?: string;
  tenantId?: string;
  unitId?: string;
  category?: string;
  documentType?: string;
  [key: string]: string | undefined;
}

/**
 * Generate a structured file path based on context and metadata
 */
function generateFilePath(
  fileName: string,
  context: StorageContext,
  folderPath?: string,
  metadata?: StorageMetadata
): string {
  const timestamp = Date.now();
  const fileExtension = fileName.split('.').pop() || 'file';
  const uniqueFileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

  // Use provided folderPath if available, otherwise generate based on context and metadata
  if (folderPath) {
    return `${folderPath}/${uniqueFileName}`;
  }

  // Validate required metadata
  if (!metadata?.userId) {
    throw new Error('userId is required for all file uploads for security');
  }

  // Generate secure path based on context and metadata
  switch (context) {
    case 'property_images':
      if (!metadata.propertyId) {
        throw new Error('propertyId is required for property images');
      }
      return `users/${metadata.userId}/properties/${metadata.propertyId}/${metadata.category || 'general'}/${uniqueFileName}`;
      
    case 'tenant_documents':
    case 'documents': {
      if (!metadata.tenantId) {
        throw new Error('tenantId is required for tenant documents');
      }
      const docType = metadata.documentType || 'other';
      return `users/${metadata.userId}/tenants/${metadata.tenantId}/documents/${docType}/${uniqueFileName}`;
    }
      
    case 'maintenance_files':
      if (!metadata.propertyId) {
        throw new Error('propertyId is required for maintenance files');
      }
      return `users/${metadata.userId}/properties/${metadata.propertyId}/maintenance/${uniqueFileName}`;
      
    case 'agreements': {
      if (!metadata.propertyId) {
        throw new Error('propertyId is required for agreements');
      }
      if (!metadata.tenantId) {
        throw new Error('tenantId is required for agreements');
      }
      return `users/${metadata.userId}/properties/${metadata.propertyId}/tenants/${metadata.tenantId}/agreements/${uniqueFileName}`;
    }
      
    case 'id_documents':
      return `users/${metadata.userId}/id/${uniqueFileName}`;
      
    default:
      return `users/${metadata.userId}/general/${uniqueFileName}`;
  }
}

/**
 * Validate file before upload
 */
function validateFile(file: File, context: StorageContext): { isValid: boolean; error?: string } {
  const config = STORAGE_CONFIG[context];
  
  if (!config) {
    return { isValid: false, error: `Invalid storage context: ${context}` };
  }

  // Check file size
  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
    return { isValid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type ${file.type} is not allowed for ${context}` };
  }

  return { isValid: true };
}

/**
 * Upload a file to Supabase storage bucket
 * This is the main function that DocumentUploadForm and other components expect
 */
export const uploadFileToBucket = async (
  file: File,
  bucketNameOrContext: string,
  folderPath?: string,
  metadata?: StorageMetadata
): Promise<UploadResult> => {
  try {
    // Determine context - if bucketNameOrContext matches a known context, use it
    let context: StorageContext;
    let bucketName: string;

    if (isValidStorageContext(bucketNameOrContext)) {
      context = bucketNameOrContext;
      bucketName = STORAGE_CONFIG[context].bucket;
    } else {
      // Legacy support - try to map bucket name to context
      const contextEntry = Object.entries(STORAGE_CONFIG).find(
        ([, config]) => config.bucket === bucketNameOrContext
      );
      
      if (contextEntry) {
        context = contextEntry[0] as StorageContext;
        bucketName = bucketNameOrContext;
      } else {
        // Fallback - use documents context for unknown buckets
        context = 'documents';
        bucketName = STORAGE_CONFIG.documents.bucket;
        console.warn(`Unknown bucket ${bucketNameOrContext}, using documents bucket`);
      }
    }

    // Validate file
    const validation = validateFile(file, context);
    if (!validation.isValid) {
      toast.error(validation.error || 'File validation failed');
      return { success: false, error: validation.error };
    }

    // Generate file path
    const filePath = generateFilePath(file.name, context, folderPath, metadata);

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error(`Upload failed: ${uploadError.message}`);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    toast.success('File uploaded successfully!');

    return {
      success: true,
      publicUrl,
      filePath,
      mimeType: file.type,
      fileSize: file.size
    };

  } catch (error) {
    console.error('Storage service error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Get signed URL for a file (for private buckets)
 */
export const getSignedUrl = async (
  filePath: string,
  bucketNameOrContext: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  try {
    let bucketName: string;

    if (bucketNameOrContext in STORAGE_CONFIG) {
      const context = bucketNameOrContext as StorageContext;
      bucketName = STORAGE_CONFIG[context].bucket;
    } else {
      bucketName = bucketNameOrContext;
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (
  filePath: string,
  bucketNameOrContext: string
): Promise<boolean> => {
  try {
    let bucketName: string;

    if (bucketNameOrContext in STORAGE_CONFIG) {
      const context = bucketNameOrContext as StorageContext;
      bucketName = STORAGE_CONFIG[context].bucket;
    } else {
      bucketName = bucketNameOrContext;
    }

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get multiple signed URLs at once
 */
export const getMultipleSignedUrls = async (
  filePaths: string[],
  bucketNameOrContext: string,
  expiresIn: number = 3600
): Promise<string[]> => {
  try {
    let bucketName: string;

    if (bucketNameOrContext in STORAGE_CONFIG) {
      const context = bucketNameOrContext as StorageContext;
      bucketName = STORAGE_CONFIG[context].bucket;
    } else {
      bucketName = bucketNameOrContext;
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrls(filePaths, expiresIn);

    if (error) {
      console.error('Error creating signed URLs:', error);
      return [];
    }

    return data.map(item => item.signedUrl || '').filter(Boolean);
  } catch (error) {
    console.error('Error getting multiple signed URLs:', error);
    return [];
  }
};

// Export storage configuration for other modules
export { STORAGE_CONFIG }; 