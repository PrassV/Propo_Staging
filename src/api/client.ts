import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { getStoredToken, clearTokens } from '../utils/token';

// Environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds
});

// Request interceptor - adds auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getStoredToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles errors and refreshes token if needed
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle authentication errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Token is invalid or expired
      // You could implement token refresh logic here if needed
      
      // For now, just log out the user
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

    // Log error for debugging
    console.error('API Error:', {
      url: originalRequest.url,
      method: originalRequest.method,
      status: error.response?.status,
      message: errorMessage,
    });

    return Promise.reject(enhancedError);
  }
);

export default apiClient; 