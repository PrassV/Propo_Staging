import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Rate limiting parameters
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 30; // Max requests per minute
const requests: number[] = [];

// Retry parameters
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 5000;

const isRateLimited = () => {
  const now = Date.now();
  // Remove old requests
  while (requests.length && requests[0] < now - RATE_LIMIT_WINDOW) {
    requests.shift();
  }
  return requests.length >= MAX_REQUESTS;
};

const retryFetch = async (url: RequestInfo, options: RequestInit, retries = MAX_RETRIES): Promise<Response> => {
  let lastError: Error | null = null;
  let delay = INITIAL_RETRY_DELAY;

  for (let i = 0; i <= retries; i++) {
    try {
      // Check rate limiting
      if (isRateLimited()) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW));
      }

      // Add request timestamp
      requests.push(Date.now());

      const response = await fetch(url, options);
      
      // Handle rate limit response
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        // Try to refresh the session
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          // Retry the original request
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        // Exponential backoff with max delay
        delay = Math.min(delay * 2, MAX_RETRY_DELAY);
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'propify-auth',
    flowType: 'pkce',
    debug: process.env.NODE_ENV === 'development'
  },
  global: {
    fetch: retryFetch
  }
});

// Refresh session periodically
let refreshTimeout: NodeJS.Timeout;
const scheduleSessionRefresh = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Refresh 5 minutes before expiry
      const expiresIn = new Date(session.expires_at || '').getTime() - Date.now() - (5 * 60 * 1000);
      if (expiresIn > 0) {
        refreshTimeout = setTimeout(async () => {
          await supabase.auth.refreshSession();
          scheduleSessionRefresh();
        }, expiresIn);
      }
    }
  } catch (error) {
    console.error('Error scheduling session refresh:', error);
  }
};

// Add session refresh on app focus and periodic refresh
if (typeof window !== 'undefined') {
  window.addEventListener('focus', async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.refreshSession();
        scheduleSessionRefresh();
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  });

  // Start session refresh schedule
  scheduleSessionRefresh();

  // Cleanup on window unload
  window.addEventListener('unload', () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
  });
}

// Add connection status check
export const checkConnection = async () => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      if (error) throw error;
      return true;
    } catch (err) {
      if (i === MAX_RETRIES - 1) return false;
      await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, i)));
    }
  }
  return false;
};