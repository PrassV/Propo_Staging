import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80";

// Define possible bucket names (in case of misconfiguration)
// Supabase is case-sensitive with bucket names
const POSSIBLE_BUCKET_NAMES = [
  'propertyimage',
  'PropertyImage',
  'property-image',
  'propertyImage',
  'property_image',
  'images',
  'property-images',
  'properties'
];

// Keep track of which bucket works
let workingBucketName: string | null = null;

export type ImageCategory = 'exterior' | 'interior' | 'other';

interface UploadResult {
  path: string;
  url: string;
  error?: Error;
}

// Function to check if bucket exists and is accessible
export async function findWorkingBucket(): Promise<string | null> {
  if (workingBucketName) return workingBucketName;
  
  console.log('Attempting to find working bucket...');
  
  for (const bucketName of POSSIBLE_BUCKET_NAMES) {
    try {
      // Try to list files in the bucket
      const { error } = await supabase.storage.from(bucketName).list();
      
      if (!error) {
        console.log(`Found working bucket: ${bucketName}`);
        workingBucketName = bucketName;
        return bucketName;
      }
    } catch (error) {
      console.error(`Error checking bucket ${bucketName}:`, error);
    }
  }
  
  console.warn('No working bucket found among possible names');
  return null;
}

export async function uploadImage(file: File, propertyId: string): Promise<UploadResult> {
  try {
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not an image file`);
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`${file.name} is too large (max 10MB)`);
    }

    // Find working bucket first
    const bucketName = await findWorkingBucket() || 'propertyimage';

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `properties/${propertyId}/${timestamp}-${sanitizedFileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
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

export async function getImageUrl(path: string | null | undefined): Promise<string> {
  try {
    if (!path) {
      console.warn('No image path provided, using default image');
      return DEFAULT_IMAGE;
    }
    
    // If it's already a complete URL (like our fallback image), use it
    if (path.startsWith('http')) {
      return path;
    }
    
    // Try to find a working bucket name
    const bucketName = await findWorkingBucket() || 'propertyimage';
    
    // FOR DEBUGGING: Log the path and attempts
    console.log(`Trying to get image: ${path} from bucket: ${bucketName}`);
    
    // Try a few different path formats in case the database stored path is different than expected
    const pathVariations = [
      path,
      path.startsWith('/') ? path.substring(1) : path,
      !path.startsWith('/') ? `/${path}` : path
    ];
    
    for (const currentPath of pathVariations) {
      try {
        // First try to get a signed URL instead of a public URL
        try {
          const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(currentPath, 3600); // 1 hour expiry
            
          if (!error && data && data.signedUrl) {
            console.log(`Found working signed URL for: ${currentPath}`);
            return data.signedUrl;
          }
        } catch (signedUrlError) {
          console.warn(`Failed to get signed URL for path: ${currentPath}`, signedUrlError);
          // Continue to try public URL as fallback
        }
        
        // Fall back to public URL if signed URL fails
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(currentPath);
        
        // Check if the URL would work by making a HEAD request
        try {
          const response = await fetch(publicUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log(`Found working public URL: ${publicUrl}`);
            return publicUrl;
          }
        } 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        catch (error) {
          // Ignore fetch errors and continue trying other paths
          console.warn(`Image URL exists but may not be accessible: ${publicUrl}`);
        }
      } 
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      catch (error) {
        // Ignore URL generation errors and continue trying other paths
        console.warn(`Failed to get URL for path: ${currentPath}`);
      }
    }
    
    // If we get here, none of the attempts worked
    console.warn(`All attempts to get image failed for: ${path}`);
    return DEFAULT_IMAGE;
  } catch (error) {
    console.error('Error getting image URL:', error);
    return DEFAULT_IMAGE;
  }
}
