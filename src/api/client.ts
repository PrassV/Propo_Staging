import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { getStoredToken, clearTokens } from '../utils/token';

// Log the variable value AT BUILD TIME
console.log('[BUILD_LOG] VITE_API_URL:', import.meta.env.VITE_API_URL);

// Environment variables
let API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:8000';

// Ensure HTTPS is always used in production
if (API_BASE_URL.startsWith('http://') && import.meta.env.PROD) {
  API_BASE_URL = API_BASE_URL.replace('http://', 'https://');
  console.warn('[API Client] Forced HTTPS for security in production environment');
}

// Log the value being used for baseURL
console.log('[BUILD_LOG] Axios baseURL will be set to:', API_BASE_URL);

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds
});

// Request interceptor - adds auth token to requests, ensures HTTPS, and logs requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add auth token
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Ensure HTTPS for all URLs in all environments
    if (config.url) {
      // For full URLs that might be used in the request
      if (config.url.startsWith('http://')) {
        config.url = config.url.replace('http://', 'https://');
        console.warn(`[API Client] Forced HTTPS for URL: ${config.url}`);
      }

      // For baseURL
      if (config.baseURL && config.baseURL.startsWith('http://')) {
        config.baseURL = config.baseURL.replace('http://', 'https://');
        console.warn(`[API Client] Forced HTTPS for baseURL: ${config.baseURL}`);
      }
    }

    // Log all requests in development mode
    if (!import.meta.env.PROD) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        params: config.params,
        data: config.data,
        headers: {
          ...config.headers,
          Authorization: config.headers?.Authorization ? 'Bearer [TOKEN]' : undefined // Don't log actual token
        }
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors and refreshes token if needed
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses in development mode
    if (!import.meta.env.PROD) {
      console.log(`[API Response] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        data: response.data
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle authentication errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Token is invalid or expired
      console.warn('[API Auth Error] 401 Unauthorized - Logging out user');
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Format error messages
    let errorMessage = 'An unexpected error occurred';

    if (error.response?.data && typeof error.response.data === 'object') {
      if ('detail' in error.response.data) {
        errorMessage = error.response.data.detail as string;
      } else if ('message' in error.response.data) {
        errorMessage = error.response.data.message as string;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Add structured error info
    const enhancedError = {
      ...error,
      formattedMessage: errorMessage,
      timestamp: new Date().toISOString(),
    };

    // Log detailed error information
    console.error('[API Error]', {
      url: `${originalRequest.baseURL}${originalRequest.url}`,
      method: originalRequest.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: errorMessage,
      params: originalRequest.params,
      data: originalRequest.data,
      responseData: error.response?.data
    });

    // Special handling for common error codes
    if (error.response?.status === 403) {
      console.warn('[API Permission Error] 403 Forbidden - Check user permissions or authentication token');
    } else if (error.response?.status === 404) {
      console.warn(`[API Not Found Error] 404 Not Found - Endpoint does not exist: ${originalRequest.method} ${originalRequest.url}`);
    } else if (error.response?.status === 307) {
      console.warn(`[API Redirect Error] 307 Temporary Redirect - Request is being redirected`);
      // You could follow the redirect manually here if needed
    }

    return Promise.reject(enhancedError);
  }
);

export default apiClient;