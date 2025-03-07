import { supabase } from '../../lib/supabase';
import { validateFile } from './validation';
import { generateFilePath } from './paths';
import { ImageCategory, UploadResult } from './types';
import toast from 'react-hot-toast';

export async function uploadImage(
  file: File,
  userId: string,
  propertyId: string,
  category: ImageCategory = 'other'
): Promise<UploadResult> {
  try {
    // Validate file
    validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedTypes: ['image/']
    });

    // Generate file path
    const filePath = generateFilePath(userId, propertyId, file.name, category);

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('propertyimage')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return { path: filePath };
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    toast.error(errorMessage);
    return { path: '', error: error instanceof Error ? error : new Error(errorMessage) };
  }
}

export async function uploadDocument(
  file: File,
  userId: string,
  propertyId: string
): Promise<UploadResult> {
  try {
    // Validate file
    validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB for documents
      allowedTypes: ['application/pdf', 'image/']
    });

    // Generate file path
    const filePath = generateFilePath(userId, propertyId, file.name, 'documents');

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('propertyimage')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return { path: filePath };
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    toast.error(errorMessage);
    return { path: '', error: error instanceof Error ? error : new Error(errorMessage) };
  }
}