import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80";

export type ImageCategory = 'exterior' | 'interior' | 'other';

export async function uploadImage(file: File, userId: string, propertyId: string, category: ImageCategory): Promise<{ path: string; error?: Error }> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not an image file`);
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${file.name} is too large (max 10MB)`);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${propertyId}/${category}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('property-images')
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

export async function uploadPropertyImages(files: File[], userId: string): Promise<string[]> {
  const imageUrls: string[] = [];

  for (const file of files) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('propertyimage')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('propertyimage')
        .getPublicUrl(filePath);

      imageUrls.push(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  }

  return imageUrls;
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return DEFAULT_IMAGE;
  
  // Check if the path is already a full URL
  if (path.startsWith('http')) {
    return path;
  }
  
  // Otherwise, get the public URL from Supabase
  const { data: { publicUrl } } = supabase.storage
    .from('propertyimage')
    .getPublicUrl(path);
    
  return publicUrl || DEFAULT_IMAGE;
}