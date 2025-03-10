import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80";

export type ImageCategory = 'exterior' | 'interior' | 'other';

interface UploadResult {
  path: string;
  url: string;
  error?: Error;
}

export async function uploadImage(file: File, propertyId: string, category: ImageCategory = 'other'): Promise<UploadResult> {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not an image file`);
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${file.name} is too large (max 10MB)`);
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `properties/${propertyId}/${timestamp}-${sanitizedFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('propertyimage')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('propertyimage')
      .getPublicUrl(filePath);

    return { path: filePath, url: publicUrl };
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    toast.error(errorMessage);
    return { path: '', url: '', error: error instanceof Error ? error : new Error(errorMessage) };
  }
}

export async function uploadPropertyImages(files: File[], propertyId: string): Promise<{ paths: string[], urls: string[] }> {
  const uploadedPaths: string[] = [];
  const uploadedUrls: string[] = [];

  for (const file of files) {
    try {
      const { path, url, error } = await uploadImage(file, propertyId);
      if (error) continue;
      
      uploadedPaths.push(path);
      uploadedUrls.push(url);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  }

  return { paths: uploadedPaths, urls: uploadedUrls };
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return DEFAULT_IMAGE;
  
  if (path.startsWith('http')) {
    return path;
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('propertyimage')
    .getPublicUrl(path);
    
  return publicUrl || DEFAULT_IMAGE;
}
