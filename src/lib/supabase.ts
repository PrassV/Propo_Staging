import { createClient } from '@supabase/supabase-js';
import { cacheService } from '../utils/cache';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced Supabase client with caching
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cached query wrapper
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

// Batch request handler
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
