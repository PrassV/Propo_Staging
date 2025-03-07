// URL configuration
const config = {
  // Get base URL based on environment
  getBaseUrl: () => {
    // Use the current origin (hostname) for all environments
    return window.location.origin;
  }
};

export default config;