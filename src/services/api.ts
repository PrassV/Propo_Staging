import axios from 'axios';
import { RentCalculationData, PropertyFeatures } from './types';

// Define missing types
interface MaintenanceRequest {
  propertyId: string;
  tenantId: string;
  issueType: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: string[];
}

interface AnalyticsRequest {
  startDate: string;
  endDate: string;
  propertyIds?: string[];
  metrics: string[];
}

// Create axios instance with base URL from environment variables 
// or default to the backend API URL
const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to handle authentication
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      // Redirect to login page if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Organize API services by domain
export const paymentService = {
  calculateRent: async (data: RentCalculationData) => {
    const response = await api.post('/payments/calculate-rent', data);
    return response.data;
  },
};

export const estimationService = {
  estimateRent: async (features: PropertyFeatures) => {
    const response = await api.post('/estimation/estimate-rent', features);
    return response.data;
  },
};

export const maintenanceService = {
  processRequest: async (request: MaintenanceRequest) => {
    const response = await api.post('/maintenance/process-maintenance', request);
    return response.data;
  },
};

export const analyticsService = {
  generateReport: async (request: AnalyticsRequest) => {
    const response = await api.post('/analytics/generate-analytics', request);
    return response.data;
  },
};

// Main API export
export default api;