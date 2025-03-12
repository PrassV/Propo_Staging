import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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