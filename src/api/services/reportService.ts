import apiClient from '../client';

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
    const response = await apiClient.get<DashboardDataResponse>('/dashboard/data', { params });
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