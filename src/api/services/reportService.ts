import api from '../client';

// --- Interfaces matching Backend DB response structures ---
interface PropertyStats {
  total_properties: number;
  total_rented: number;
  total_vacant: number;
  total_under_maintenance: number;
  occupancy_rate: number;
}

interface RevenueStats {
  monthly_rental_income: number;
  yearly_rental_income: number;
  average_rent_per_property: number;
  total_security_deposits: number;
}

interface TenantStats {
  total_tenants: number;
  upcoming_lease_expiries: number;
  lease_renewals_last_90_days: number;
  average_lease_duration: number;
}

interface RentCollection {
    collected_current_month: number;
    pending_current_month: number;
    overdue_amount: number;
    collection_rate: number;
}

interface MonthlyRevenue {
    month: string; // ISO date string
    revenue?: number; // Optional as it's sample data for now
    expenses?: number; // Optional as it's sample data for now
    net_income?: number; // Optional as it's sample data for now
}

interface OccupancyHistory {
    month: string; // ISO date string
    occupancy_rate?: number; // Optional as it's sample data for now
}

// --- Nested Summary Structure --- 
// Matches the 'summary' object returned by the service
interface DashboardSummaryNested {
  property_stats?: PropertyStats;
  revenue?: RevenueStats;
  tenant_stats?: TenantStats;
  rent_collection?: RentCollection; 
}

// --- Main Data Structure --- 
// Matches the object returned by get_dashboard_data service
export interface DashboardData {
  summary?: DashboardSummaryNested; // Make optional for safety
  monthly_revenue?: MonthlyRevenue[];
  occupancy_history?: OccupancyHistory[];
}

// Response structure from /dashboard/data API endpoint
interface DashboardDataResponse {
    data: DashboardData; // Use the new detailed structure
    message: string;
}

/**
 * Fetches dashboard data from the /dashboard/data endpoint.
 * @param months - Optional number of months for historical data.
 */
export const getDashboardData = async (months?: number): Promise<DashboardData> => {
  try {
    const params = months ? { months } : {};
    // Expect the API to return DashboardDataResponse structure
    const response = await api.get<DashboardDataResponse>('/dashboard/data', { params });
    // Return the nested data object which matches DashboardData interface
    return response.data.data; 
  } catch (error: unknown) {
    console.error('Error fetching dashboard data:', error);
    let errorMessage = 'Failed to fetch dashboard data';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const responseError = error as { response?: { data?: { detail?: string } } };
        errorMessage = responseError.response?.data?.detail || errorMessage;
    }
    // Return an empty object or partial data on error? Rethrow for now.
    throw new Error(errorMessage);
  }
};

// Function to generate a detailed report (example - implement based on backend)
// export const generateDetailedReport = async (params: ReportGenerationParams): Promise<ReportGenerationResponse> => {
//   const response = await apiClient.post<ReportGenerationResponse>('/reports/generate', params);
//   return response.data;
// }; 

export interface FinancialReport {
  period: string;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  occupancy_rate: number;
  rent_collected: number;
  maintenance_costs: number;
  vacancy_loss: number;
  operating_expenses: number;
  profit_margin: number;
}

export interface PropertyPerformance {
  property_id: string;
  property_name: string;
  units_count: number;
  occupied_units: number;
  monthly_rent: number;
  maintenance_costs: number;
  vacancy_rate: number;
  roi: number;
  tenant_satisfaction: number;
  average_rent_per_unit: number;
  maintenance_cost_per_unit: number;
}

export interface MaintenanceAnalytics {
  total_requests: number;
  completed_requests: number;
  pending_requests: number;
  average_completion_time: number;
  total_cost: number;
  cost_by_category: { category: string; amount: number; percentage: number }[];
  trending_issues: { issue: string; count: number; trend: 'up' | 'down' | 'stable' }[];
  vendor_performance: { vendor_id: string; vendor_name: string; completion_rate: number; avg_cost: number; rating: number }[];
}

export interface TenantRetentionData {
  total_tenants: number;
  retained_tenants: number;
  retention_rate: number;
  average_tenancy_duration: number;
  renewal_rate: number;
  satisfaction_score: number;
  churn_reasons: { reason: string; count: number; percentage: number }[];
  retention_by_property: { property_id: string; property_name: string; retention_rate: number }[];
}

export interface OccupancyAnalytics {
  current_occupancy_rate: number;
  target_occupancy_rate: number;
  vacancy_trends: { period: string; vacancy_rate: number; units_vacant: number }[];
  turnover_rate: number;
  average_vacancy_duration: number;
  seasonal_patterns: { month: string; avg_occupancy: number }[];
}

export interface CustomReportFilter {
  date_range: { start: string; end: string };
  properties: string[];
  report_type: string;
  metrics: string[];
  group_by?: 'property' | 'month' | 'quarter' | 'year';
  include_projections?: boolean;
}

export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  include_charts: boolean;
  include_summary: boolean;
  template?: string;
}

export interface FinancialProjection {
  period: string;
  projected_income: number;
  projected_expenses: number;
  projected_profit: number;
  confidence_level: number;
  assumptions: string[];
}

// Get financial reports
export const getFinancialReports = async (startDate?: string, endDate?: string): Promise<FinancialReport[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/reports/financial?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching financial reports:', error);
    // Mock data for development
    return [
      {
        period: '2024-01',
        total_income: 125000,
        total_expenses: 45000,
        net_profit: 80000,
        occupancy_rate: 94.5,
        rent_collected: 118000,
        maintenance_costs: 15000,
        vacancy_loss: 7000,
        operating_expenses: 30000,
        profit_margin: 64.0
      },
      {
        period: '2023-12',
        total_income: 120000,
        total_expenses: 42000,
        net_profit: 78000,
        occupancy_rate: 92.0,
        rent_collected: 115000,
        maintenance_costs: 18000,
        vacancy_loss: 5000,
        operating_expenses: 24000,
        profit_margin: 65.0
      }
    ];
  }
};

// Get property performance data
export const getPropertyPerformance = async (propertyIds?: string[]): Promise<PropertyPerformance[]> => {
  try {
    const params = new URLSearchParams();
    if (propertyIds?.length) {
      propertyIds.forEach(id => params.append('property_ids', id));
    }
    
    const response = await api.get(`/reports/property-performance?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching property performance:', error);
    // Mock data for development
    return [
      {
        property_id: '1',
        property_name: 'Sunset Apartments',
        units_count: 24,
        occupied_units: 23,
        monthly_rent: 45000,
        maintenance_costs: 8500,
        vacancy_rate: 4.2,
        roi: 12.8,
        tenant_satisfaction: 4.6,
        average_rent_per_unit: 1875,
        maintenance_cost_per_unit: 354
      },
      {
        property_id: '2',
        property_name: 'Downtown Lofts',
        units_count: 18,
        occupied_units: 16,
        monthly_rent: 38000,
        maintenance_costs: 6200,
        vacancy_rate: 11.1,
        roi: 10.4,
        tenant_satisfaction: 4.2,
        average_rent_per_unit: 2111,
        maintenance_cost_per_unit: 344
      }
    ];
  }
};

// Get maintenance analytics
export const getMaintenanceAnalytics = async (startDate?: string, endDate?: string): Promise<MaintenanceAnalytics> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await api.get(`/reports/maintenance-analytics?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching maintenance analytics:', error);
    // Mock data for development
    return {
      total_requests: 156,
      completed_requests: 142,
      pending_requests: 14,
      average_completion_time: 3.2,
      total_cost: 24500,
      cost_by_category: [
        { category: 'Plumbing', amount: 8500, percentage: 34.7 },
        { category: 'Electrical', amount: 6200, percentage: 25.3 },
        { category: 'HVAC', amount: 4800, percentage: 19.6 },
        { category: 'Appliances', amount: 3200, percentage: 13.1 },
        { category: 'Other', amount: 1800, percentage: 7.3 }
      ],
      trending_issues: [
        { issue: 'Water Leaks', count: 23, trend: 'up' },
        { issue: 'AC Issues', count: 18, trend: 'stable' },
        { issue: 'Electrical Problems', count: 15, trend: 'down' }
      ],
      vendor_performance: [
        { vendor_id: '1', vendor_name: 'ABC Plumbing', completion_rate: 95.2, avg_cost: 285, rating: 4.8 },
        { vendor_id: '2', vendor_name: 'XYZ Electric', completion_rate: 88.7, avg_cost: 320, rating: 4.5 }
      ]
    };
  }
};

// Get tenant retention data
export const getTenantRetentionData = async (): Promise<TenantRetentionData> => {
  try {
    const response = await api.get('/reports/tenant-retention');
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant retention data:', error);
    // Mock data for development
    return {
      total_tenants: 68,
      retained_tenants: 58,
      retention_rate: 85.3,
      average_tenancy_duration: 18.5,
      renewal_rate: 78.2,
      satisfaction_score: 4.5,
      churn_reasons: [
        { reason: 'Relocation', count: 4, percentage: 40.0 },
        { reason: 'Rent Increase', count: 3, percentage: 30.0 },
        { reason: 'Property Issues', count: 2, percentage: 20.0 },
        { reason: 'Other', count: 1, percentage: 10.0 }
      ],
      retention_by_property: [
        { property_id: '1', property_name: 'Sunset Apartments', retention_rate: 88.5 },
        { property_id: '2', property_name: 'Downtown Lofts', retention_rate: 82.1 }
      ]
    };
  }
};

// Get occupancy analytics
export const getOccupancyAnalytics = async (): Promise<OccupancyAnalytics> => {
  try {
    const response = await api.get('/reports/occupancy-analytics');
    return response.data;
  } catch (error) {
    console.error('Error fetching occupancy analytics:', error);
    // Mock data for development
    return {
      current_occupancy_rate: 92.5,
      target_occupancy_rate: 95.0,
      vacancy_trends: [
        { period: '2024-01', vacancy_rate: 7.5, units_vacant: 5 },
        { period: '2023-12', vacancy_rate: 8.0, units_vacant: 6 },
        { period: '2023-11', vacancy_rate: 10.5, units_vacant: 8 }
      ],
      turnover_rate: 15.2,
      average_vacancy_duration: 28.5,
      seasonal_patterns: [
        { month: 'Jan', avg_occupancy: 92.5 },
        { month: 'Feb', avg_occupancy: 94.2 },
        { month: 'Mar', avg_occupancy: 96.1 }
      ]
    };
  }
};

// Generate custom report
export const generateCustomReport = async (filters: CustomReportFilter): Promise<unknown> => {
  try {
    const response = await api.post('/reports/custom', filters);
    return response.data;
  } catch (error) {
    console.error('Error generating custom report:', error);
    throw error;
  }
};

// Export report
export const exportReport = async (reportType: string, filters: CustomReportFilter, options: ReportExportOptions): Promise<Blob> => {
  try {
    const response = await api.post('/reports/export', {
      report_type: reportType,
      filters,
      options
    }, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting report:', error);
    throw error;
  }
};

// Get financial projections
export const getFinancialProjections = async (months: number = 12): Promise<FinancialProjection[]> => {
  try {
    const response = await api.get(`/reports/projections?months=${months}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching financial projections:', error);
    // Mock data for development
    return [
      {
        period: '2024-02',
        projected_income: 128000,
        projected_expenses: 46000,
        projected_profit: 82000,
        confidence_level: 85.2,
        assumptions: ['Current occupancy maintained', 'No major maintenance issues']
      },
      {
        period: '2024-03',
        projected_income: 130000,
        projected_expenses: 47000,
        projected_profit: 83000,
        confidence_level: 82.8,
        assumptions: ['Seasonal rent increase', 'Normal maintenance costs']
      }
    ];
  }
};

// Get report templates
export const getReportTemplates = async (): Promise<unknown[]> => {
  try {
    const response = await api.get('/reports/templates');
    return response.data;
  } catch (error) {
    console.error('Error fetching report templates:', error);
    // Mock data for development
    return [
      {
        id: 'monthly_financial',
        name: 'Monthly Financial Report',
        description: 'Comprehensive monthly financial overview',
        type: 'financial',
        default_filters: {
          date_range: { start: '', end: '' },
          metrics: ['income', 'expenses', 'profit', 'occupancy']
        }
      },
      {
        id: 'property_comparison',
        name: 'Property Performance Comparison',
        description: 'Compare performance across properties',
        type: 'property',
        default_filters: {
          metrics: ['roi', 'occupancy', 'maintenance_costs', 'satisfaction']
        }
      }
    ];
  }
};

// Schedule automated report
export const scheduleAutomatedReport = async (reportConfig: any): Promise<any> => {
  try {
    const response = await api.post('/reports/schedule', reportConfig);
    return response.data;
  } catch (error) {
    console.error('Error scheduling automated report:', error);
    throw error;
  }
};

// Get scheduled reports
export const getScheduledReports = async (): Promise<any[]> => {
  try {
    const response = await api.get('/reports/scheduled');
    return response.data;
  } catch (error) {
    console.error('Error fetching scheduled reports:', error);
    return [];
  }
};

// Get report history
export const getReportHistory = async (limit = 20): Promise<any[]> => {
  try {
    const response = await api.get(`/reports/history?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching report history:', error);
    return [];
  }
};

// Get dashboard metrics
export const getDashboardMetrics = async (): Promise<unknown> => {
  try {
    const response = await api.get('/reports/dashboard-metrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    // Mock data for development
    return {
      total_properties: 3,
      total_units: 74,
      occupied_units: 68,
      monthly_revenue: 125000,
      monthly_expenses: 45000,
      net_profit: 80000,
      occupancy_rate: 91.9,
      maintenance_requests: 14,
      tenant_satisfaction: 4.5,
      trends: {
        revenue_change: 4.2,
        occupancy_change: 2.5,
        maintenance_change: -8.3
      }
    };
  }
};

// Bulk export multiple reports
export const bulkExportReports = async (reportConfigs: unknown[]): Promise<Blob> => {
  try {
    const response = await api.post('/reports/bulk-export', {
      reports: reportConfigs
    }, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error bulk exporting reports:', error);
    throw error;
  }
};

// ===== UNIT-LEVEL ANALYTICS METHODS =====

export interface UnitAnalytics {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  propertyName: string;
  
  // Financial Metrics
  monthlyRent: number;
  yearlyRevenue: number;
  maintenanceCosts: number;
  profitMargin: number;
  roi: number;
  revenuePerSqFt: number;
  
  // Occupancy Metrics
  occupancyRate: number;
  vacancyDuration: number;
  turnoverRate: number;
  leaseRenewalRate: number;
  
  // Operational Metrics
  maintenanceFrequency: number;
  averageMaintenanceCost: number;
  tenantSatisfaction: number;
  paymentTimeliness: number;
  
  // Trends (last 12 months)
  revenueTrend: Array<{ month: string; revenue: number }>;
  occupancyTrend: Array<{ month: string; occupancy: number }>;
  maintenanceTrend: Array<{ month: string; cost: number; requests: number }>;
}

export interface UnitPerformanceMetrics {
  unitId: string;
  
  // Current Performance
  currentMetrics: {
    monthlyRevenue: number;
    occupancyStatus: 'occupied' | 'vacant' | 'maintenance';
    daysVacant: number;
    maintenanceRequests: number;
    tenantSatisfaction: number;
  };
  
  // Comparative Performance
  propertyAverage: {
    revenue: number;
    occupancy: number;
    maintenance: number;
    satisfaction: number;
  };
  
  // Performance Indicators
  indicators: {
    revenueHealth: 'excellent' | 'good' | 'average' | 'poor';
    occupancyHealth: 'excellent' | 'good' | 'average' | 'poor';
    maintenanceHealth: 'excellent' | 'good' | 'average' | 'poor';
    overallHealth: 'excellent' | 'good' | 'average' | 'poor';
  };
  
  // Recommendations
  recommendations: Array<{
    type: 'revenue' | 'occupancy' | 'maintenance' | 'tenant';
    priority: 'emergency' | 'urgent' | 'normal' | 'low';
    title: string;
    description: string;
    estimatedImpact: string;
  }>;
}

export interface UnitPredictiveInsights {
  unitId: string;
  
  // Revenue Predictions
  revenueForecast: Array<{
    month: string;
    predictedRevenue: number;
    confidence: number;
  }>;
  
  // Occupancy Predictions
  occupancyForecast: {
    nextVacancyDate: string | null;
    vacancyProbability: number;
    expectedVacancyDuration: number;
  };
  
  // Maintenance Predictions
  maintenanceForecast: Array<{
    category: string;
    predictedDate: string;
    estimatedCost: number;
    confidence: number;
  }>;
  
  // Market Insights
  marketInsights: {
    rentOptimization: {
      currentRent: number;
      suggestedRent: number;
      potentialIncrease: number;
      marketConfidence: number;
    };
    competitivePosition: 'above_market' | 'at_market' | 'below_market';
    demandLevel: 'high' | 'medium' | 'low';
  };
  
  // Risk Assessment
  riskFactors: Array<{
    type: 'financial' | 'operational' | 'market';
    risk: string;
    probability: number;
    impact: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
}

// Get comprehensive analytics for a specific unit
export const getUnitAnalytics = async (unitId: string): Promise<UnitAnalytics> => {
  try {
    const response = await api.get(`/reports/units/${unitId}/analytics`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unit analytics:', error);
    // Return mock data for development
    return {
      unitId,
      unitNumber: '101',
      propertyId: 'prop_1',
      propertyName: 'Sunset Apartments',
      
      // Financial Metrics
      monthlyRent: 1200,
      yearlyRevenue: 14400,
      maintenanceCosts: 850,
      profitMargin: 94.1,
      roi: 12.8,
      revenuePerSqFt: 1.85,
      
      // Occupancy Metrics
      occupancyRate: 95.8,
      vacancyDuration: 12,
      turnoverRate: 8.3,
      leaseRenewalRate: 85.0,
      
      // Operational Metrics
      maintenanceFrequency: 2.1,
      averageMaintenanceCost: 425,
      tenantSatisfaction: 4.6,
      paymentTimeliness: 98.5,
      
      // Trends
      revenueTrend: [
        { month: '2024-01', revenue: 1200 },
        { month: '2023-12', revenue: 1200 },
        { month: '2023-11', revenue: 1150 }
      ],
      occupancyTrend: [
        { month: '2024-01', occupancy: 100 },
        { month: '2023-12', occupancy: 100 },
        { month: '2023-11', occupancy: 87 }
      ],
      maintenanceTrend: [
        { month: '2024-01', cost: 125, requests: 1 },
        { month: '2023-12', cost: 0, requests: 0 },
        { month: '2023-11', cost: 450, requests: 2 }
      ]
    };
  }
};

// Get performance metrics for a specific unit
export const getUnitPerformanceMetrics = async (unitId: string): Promise<UnitPerformanceMetrics> => {
  try {
    const response = await api.get(`/reports/units/${unitId}/performance`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unit performance metrics:', error);
    // Return mock data for development
    return {
      unitId,
      
      currentMetrics: {
        monthlyRevenue: 1200,
        occupancyStatus: 'occupied',
        daysVacant: 0,
        maintenanceRequests: 1,
        tenantSatisfaction: 4.6
      },
      
      propertyAverage: {
        revenue: 1150,
        occupancy: 92.5,
        maintenance: 2.3,
        satisfaction: 4.2
      },
      
      indicators: {
        revenueHealth: 'good',
        occupancyHealth: 'excellent',
        maintenanceHealth: 'excellent',
        overallHealth: 'good'
      },
      
      recommendations: [
        {
          type: 'revenue',
          priority: 'normal',
          title: 'Rent Optimization Opportunity',
          description: 'Market analysis suggests rent could be increased by 5-8%',
          estimatedImpact: '+₹60-96/month'
        },
        {
          type: 'maintenance',
          priority: 'low',
          title: 'Preventive Maintenance',
          description: 'Schedule HVAC inspection to prevent future issues',
          estimatedImpact: 'Prevent ₹300-500 in repairs'
        }
      ]
    };
  }
};

// Get predictive insights for a specific unit
export const getUnitPredictiveInsights = async (unitId: string): Promise<UnitPredictiveInsights> => {
  try {
    const response = await api.get(`/reports/units/${unitId}/insights`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unit predictive insights:', error);
    // Return mock data for development
    return {
      unitId,
      
      revenueForecast: [
        { month: '2024-02', predictedRevenue: 1200, confidence: 95 },
        { month: '2024-03', predictedRevenue: 1260, confidence: 88 },
        { month: '2024-04', predictedRevenue: 1260, confidence: 82 }
      ],
      
      occupancyForecast: {
        nextVacancyDate: '2024-12-15',
        vacancyProbability: 15,
        expectedVacancyDuration: 18
      },
      
      maintenanceForecast: [
        {
          category: 'HVAC',
          predictedDate: '2024-06-15',
          estimatedCost: 350,
          confidence: 75
        },
        {
          category: 'Plumbing',
          predictedDate: '2024-09-20',
          estimatedCost: 200,
          confidence: 60
        }
      ],
      
      marketInsights: {
        rentOptimization: {
          currentRent: 1200,
          suggestedRent: 1280,
          potentialIncrease: 80,
          marketConfidence: 85
        },
        competitivePosition: 'below_market',
        demandLevel: 'high'
      },
      
      riskFactors: [
        {
          type: 'market',
          risk: 'Rent increase may affect tenant retention',
          probability: 25,
          impact: 'medium',
          mitigation: 'Gradual increase with tenant communication'
        }
      ]
    };
  }
};

// Get unit comparison analytics (compare unit with property/market averages)
export const getUnitComparison = async (unitId: string, propertyId: string): Promise<{
  unit: UnitAnalytics;
  propertyAverage: Partial<UnitAnalytics>;
  marketAverage: Partial<UnitAnalytics>;
  rankings: {
    revenue: { rank: number; total: number; percentile: number };
    occupancy: { rank: number; total: number; percentile: number };
    satisfaction: { rank: number; total: number; percentile: number };
    maintenance: { rank: number; total: number; percentile: number };
  };
}> => {
  try {
    const response = await api.get(`/reports/units/${unitId}/comparison?property_id=${propertyId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unit comparison:', error);
    // Return mock data for development
    const unitAnalytics = await getUnitAnalytics(unitId);
    return {
      unit: unitAnalytics,
      propertyAverage: {
        monthlyRent: 1150,
        occupancyRate: 92.5,
        tenantSatisfaction: 4.2,
        maintenanceFrequency: 2.3
      },
      marketAverage: {
        monthlyRent: 1180,
        occupancyRate: 89.2,
        tenantSatisfaction: 4.1,
        maintenanceFrequency: 2.8
      },
      rankings: {
        revenue: { rank: 3, total: 24, percentile: 87.5 },
        occupancy: { rank: 2, total: 24, percentile: 91.7 },
        satisfaction: { rank: 1, total: 24, percentile: 95.8 },
        maintenance: { rank: 5, total: 24, percentile: 79.2 }
      }
    };
  }
};

// Record unit analytics event (for tracking user interactions with analytics)
export const recordUnitAnalyticsEvent = async (unitId: string, eventType: string, data: Record<string, unknown>): Promise<void> => {
  try {
    await api.post(`/reports/units/${unitId}/events`, {
      event_type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error recording unit analytics event:', error);
    // Don't throw error to avoid breaking analytics viewing
  }
}; 