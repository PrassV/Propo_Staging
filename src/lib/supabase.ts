import { createClient } from '@supabase/supabase-js';
import { cacheService } from './cache';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Log Supabase connection info (without sensitive keys) for debugging
console.log('Initializing Supabase client with URL:', supabaseUrl);

// Initialize Supabase client for authentication only
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expose this for debugging
export const verifyBucketAccess = async (bucketName = 'propertyimage') => {
  console.log(`Verifying access to bucket: ${bucketName}`);
  try {
    // Check if the bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    console.log(`Bucket "${bucketName}" exists: ${bucketExists}`);
    console.log('Available buckets:', buckets?.map(b => b.name));
    
    if (!bucketExists) return false;
    
    // Try to list files in the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from(bucketName)
      .list();
    
    if (filesError) {
      console.error(`Error listing files in bucket "${bucketName}":`, filesError);
      return false;
    }
    
    console.log(`Successfully accessed bucket "${bucketName}". Files count: ${files?.length || 0}`);
    return true;
  } catch (error) {
    console.error('Unexpected error verifying bucket access:', error);
    return false;
  }
};

// Expose a function to directly get a public URL for testing
export const getTestPublicUrl = (bucketName = 'propertyimage', path = '') => {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  console.log(`Generated public URL for ${bucketName}/${path}:`, data.publicUrl);
  return data.publicUrl;
};

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cacheService.get<T>(key);
  if (cached) return cached;

  const result = await queryFn();
  cacheService.set(key, result, ttl);
  return result;
}

export async function batchRequests<T>(
  requests: (() => Promise<T>)[],
  batchSize = 3
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(req => req()));
    results.push(...batchResults);
  }
  
  return results;
}
