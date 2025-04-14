import apiClient from './client';
import * as services from './services';
import * as financial from './services/financialService';

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
  rentEstimation: services.rentEstimationService,
  document: services.documentService,
  reporting: services.reportingService,
  notification: services.notificationService,
  agreement: services.agreementService,
  vendor: services.vendorService,
  user: services.userService,
  financial,
};

export default api; 