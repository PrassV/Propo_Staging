import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { validateFileUpload } from '../utils/validation';
import toast from 'react-hot-toast';

interface UseFileUploadOptions {
  bucket: string;
  maxSize?: number;
  allowedTypes?: string[];
}

export function useFileUpload({ bucket, maxSize = 5 * 1024 * 1024, allowedTypes }: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File, path: string) => {
    try {
      setUploading(true);
      setError(null);

      // Validate file
      const validationErrors = validateFileUpload(file, maxSize);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { success: true, url: publicUrl };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error };
}