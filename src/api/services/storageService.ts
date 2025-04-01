import { supabase } from '../../lib/supabase'; // Assuming supabase client is initialized here
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface UploadResult {
  publicUrl: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileName: string;
}

/**
 * Uploads a file to a specified Supabase Storage bucket.
 *
 * @param file The file object to upload.
 * @param bucketName The name of the Supabase Storage bucket.
 * @param folderPath Optional path within the bucket (e.g., 'user_id/documents/').
 * @returns Promise resolving to an object with publicUrl, filePath, etc. or null on error.
 */
export const uploadFileToBucket = async (
  file: File,
  bucketName: string,
  folderPath: string = ''
): Promise<UploadResult | null> => {
  if (!file) {
    toast.error('No file selected for upload.');
    return null;
  }

  const fileExt = file.name.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExt}`;
  const filePath = folderPath ? `${folderPath.replace(/\/$/, '')}/${uniqueFileName}` : uniqueFileName;

  const toastId = toast.loading(`Uploading ${file.name}...`);
  console.log(`Uploading to bucket: ${bucketName}, path: ${filePath}`);

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files with the same generated name
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(uploadError.message || 'Failed to upload file.');
    }

    if (!uploadData || !uploadData.path) {
        throw new Error('Upload successful but no path returned from Supabase.');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);

    if (!urlData || !urlData.publicUrl) {
        // Optionally try to delete the uploaded file if URL retrieval fails?
        console.error('Failed to get public URL for path:', uploadData.path);
        throw new Error('File uploaded but failed to get public URL.');
    }

    toast.success('File uploaded successfully!', { id: toastId });

    const result: UploadResult = {
        publicUrl: urlData.publicUrl,
        filePath: uploadData.path,
        fileSize: file.size,
        mimeType: file.type,
        fileName: file.name // Original file name
    };
    
    console.log('Upload successful:', result);
    return result;

  } catch (error: unknown) {
    console.error('Error during file upload:', error);
    let message = 'File upload failed.';
    if (error instanceof Error) {
        message = error.message;
    }
    toast.error(message, { id: toastId });
    return null;
  }
}; 