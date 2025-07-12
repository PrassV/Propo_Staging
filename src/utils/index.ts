// Core utilities
export * from './auth';
export * from './date';
export * from './format';
export * from './storage';
export * from './validation';
export * from './payment';
export * from './maintenance';
export * from './property';

// Tenant validation utilities (avoiding conflicts)
export {
  validateTenantForm as validateTenantOnboardingForm
} from './tenant-validation';

// Currency utilities (INR formatting)
export {
  formatCurrency as formatINR,
  formatCurrencyWithDecimals,
  formatAmount,
  formatCompact,
  formatRent,
  formatDeposit,
  formatIncome,
  formatMaintenanceFee,
  formatPaymentStatus,
  formatPercentage,
  formatIndianNumber,
  parseCurrency,
  isValidCurrency,
  convertDollarsToRupees,
  currency
} from './currency';