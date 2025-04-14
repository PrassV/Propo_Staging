/**
 * Utility functions for debugging
 */

/**
 * Logs API request information to the console
 * @param method HTTP method
 * @param url Request URL
 * @param params Query parameters
 * @param data Request body
 */
export const logApiRequest = (method: string, url: string, params?: any, data?: any): void => {
  if (import.meta.env.DEV) {
    console.group(`🚀 API Request: ${method} ${url}`);
    if (params) console.log('Params:', params);
    if (data) console.log('Data:', data);
    console.groupEnd();
  }
};

/**
 * Logs API response information to the console
 * @param method HTTP method
 * @param url Request URL
 * @param status HTTP status code
 * @param data Response data
 */
export const logApiResponse = (method: string, url: string, status: number, data: any): void => {
  if (import.meta.env.DEV) {
    console.group(`✅ API Response: ${status} ${method} ${url}`);
    console.log('Data:', data);
    console.groupEnd();
  }
};

/**
 * Logs API error information to the console
 * @param method HTTP method
 * @param url Request URL
 * @param status HTTP status code
 * @param error Error object
 */
export const logApiError = (method: string, url: string, status: number | undefined, error: any): void => {
  console.group(`❌ API Error: ${status || 'Unknown'} ${method} ${url}`);
  console.error('Error:', error);
  console.groupEnd();
};

/**
 * Checks if a URL is using HTTPS
 * @param url URL to check
 * @returns True if the URL is using HTTPS, false otherwise
 */
export const isHttps = (url: string): boolean => {
  return url.startsWith('https://');
};

/**
 * Converts an HTTP URL to HTTPS
 * @param url URL to convert
 * @returns HTTPS URL
 */
export const ensureHttps = (url: string): string => {
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};
