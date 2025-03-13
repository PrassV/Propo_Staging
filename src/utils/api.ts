/**
 * API utilities for the application
 */

/**
 * Returns the API URL with fallbacks in order of preference:
 * 1. Environment variable (VITE_API_URL)
 * 2. Window origin (if same-origin deployment)
 * 3. The Railway production URL
 */
export const getApiUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  const originUrl = typeof window !== 'undefined' ? window.location.origin : null;
  const railwayUrl = 'https://propostaging-production.up.railway.app';
  
  return envApiUrl || originUrl || railwayUrl;
};

/**
 * Creates an API endpoint URL by combining the base API URL with the given path
 */
export const createApiEndpoint = (path: string): string => {
  const apiUrl = getApiUrl();
  // Make sure the path starts with a slash but the URL doesn't end with one
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiUrl}${normalizedPath}`;
};

/**
 * Default headers to use for API requests
 */
export const getDefaultHeaders = async (): Promise<HeadersInit> => {
  // Dynamically import to avoid circular dependencies
  const { supabase } = await import('../lib/supabase');
  
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/**
 * A wrapper around fetch that includes the auth token and default headers
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = endpoint.startsWith('http') ? endpoint : createApiEndpoint(endpoint);
  const headers = await getDefaultHeaders();
  
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });
}; 