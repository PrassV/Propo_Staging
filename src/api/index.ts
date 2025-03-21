import apiClient from './client';
import * as services from './services';

// Re-export everything
export { apiClient, services };

// Create a convenient API object for import
const api = {
  auth: services.authService,
  property: services.propertyService,
  tenant: services.tenantService,
  dashboard: services.dashboardService,
  payment: services.paymentService,
  maintenance: services.maintenanceService,
  invitation: services.invitationService,
};

export default api; 