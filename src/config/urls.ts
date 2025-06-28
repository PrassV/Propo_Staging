// URL configuration
const config = {
  // Get base URL based on environment
  getBaseUrl: () => {
    // Use the current origin (hostname) for all environments
    return window.location.origin;
  }
};

/**
 * Get the correct base URL for OAuth redirects based on environment
 */
export const getAuthRedirectUrl = (): string => {
  const isProduction = import.meta.env.PROD;
  
  if (isProduction) {
    return 'https://propo-staging.vercel.app';
  }
  
  // For development, use current origin (handles different ports)
  return window.location.origin;
};

export default config;