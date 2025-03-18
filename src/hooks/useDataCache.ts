import { useState, useEffect, useCallback } from 'react';
import { analyticsTrack } from '../utils/analytics';

interface CacheOptions {
  ttl: number;
  revalidate: boolean;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export function useDataCache<T>(
  key: string, 
  fetchFn: () => Promise<T>, 
  options: CacheOptions = { ttl: 5 * 60 * 1000, revalidate: false }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchFn();
      
      const cacheItem: CacheItem<T> = {
        data: result,
        timestamp: Date.now()
      };
      
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      
      setData(result);
      setError(null);
      
      analyticsTrack('data_fetch_success', { key });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error as Error);
      analyticsTrack('data_fetch_error', { key, error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [key, fetchFn]);

  useEffect(() => {
    const fetchData = async () => {
      const cachedItem = localStorage.getItem(`cache_${key}`);
      
      if (cachedItem) {
        try {
          const parsed = JSON.parse(cachedItem) as CacheItem<T>;
          if (Date.now() - parsed.timestamp < options.ttl) {
            setData(parsed.data);
            setLoading(false);
            
            if (options.revalidate) {
              refreshData();
            }
            return;
          }
        } catch (e) {
          console.warn(`Cache parse error for key ${key}:`, e);
        }
      }
      
      await refreshData();
    };

    fetchData();
  }, [key, options.ttl, options.revalidate, refreshData]);

  return { data, loading, error, refetch: refreshData };
}
