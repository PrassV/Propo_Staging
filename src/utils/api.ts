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

/**
 * Specifically fetch property data with better error handling for images
 */
export const fetchPropertyData = async (propertyId: string) => {
  if (!propertyId) throw new Error('Property ID is required');
  
  const response = await apiFetch(`properties/${propertyId}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch property details' }));
    console.error('Error fetching property data:', errorData);
    throw new Error(errorData.detail || 'Failed to fetch property details');
  }
  
  const property = await response.json();
  
  // Add validation for image paths
  if (property.image_urls) {
    // Check for valid image URLs
    property.image_urls = property.image_urls.filter((url: string) => {
      const isValid = url && (url.startsWith('http') || url.includes('/'));
      if (!isValid) {
        console.warn('Invalid image URL found:', url);
      }
      return isValid;
    });
  }
  
  return property;
}; 