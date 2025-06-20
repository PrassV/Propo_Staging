import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
// Removed Supabase import
// import { supabase } from '../../../lib/supabase';
import EmptyTenantState from './EmptyTenantState';
import LeaseDetails from './LeaseDetails';
import PaymentPlans from './PaymentPlans';
import PaymentHistory from './PaymentHistory';
// Removed unused import
// import RoommateDetails from './RoommateDetails'; 
import LoadingSpinner from '../../common/LoadingSpinner';
// Imports for Overview
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantPaymentStatus, RecentPaymentStatus } from '../../../api/services/paymentService';
import { getOpenTenantRequestsCount } from '../../../api/services/maintenanceService';
import { CalendarDays, Wrench, DollarSign, CreditCard } from 'lucide-react'; // Import icons

// Import the new service function and Tenant type
import { getCurrentTenantProfile } from '../../../api/services/tenantService';
import { Tenant, TenantWithProperty } from '../../../types/tenant';
import { Property } from '../../../types/property'; 

import toast from 'react-hot-toast'; 
import { Button } from "@/components/ui/button"; 
import { Link } from 'react-router-dom';

// Helper to format date string
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch { // Remove unused error variable completely
        return 'Invalid Date';
    }
};

export default function TenantDashboard() {
  const { user } = useAuth();
  // Use the potentially combined type
  const [tenantData, setTenantData] = useState<TenantWithProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State for overview data
  const [paymentStatus, setPaymentStatus] = useState<RecentPaymentStatus | null>(null);
  const [openRequestsCount, setOpenRequestsCount] = useState<number | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const fetchTenantDataAndOverview = async () => {
    if (!user) return;
    setLoading(true);
    setLoadingOverview(true);
    setError(null);

    try {
      // Call the new service function
      const currentTenantData = await getCurrentTenantProfile();
      setTenantData(currentTenantData as TenantWithProperty | null);

      // If tenant data exists, fetch overview details
      if (currentTenantData?.id) {
          try {
              // Fetch overview data using existing services
              const [status, reqCount] = await Promise.all([
                  getTenantPaymentStatus(currentTenantData.id),
                  getOpenTenantRequestsCount(currentTenantData.id)
              ]);
              setPaymentStatus(status);
              setOpenRequestsCount(reqCount);
          } catch (overviewError) {
              console.error("Error fetching tenant overview data:", overviewError);
              toast.error("Could not load some overview details."); // Changed toast message
          }
      }
    } catch (error: unknown) {
      console.error('Error fetching tenant data:', error);
      
      let message = 'Failed to fetch tenant data';
      let is404 = false;

      // Type-safe check for API error structure
      if (error && typeof error === 'object') {
        if ('response' in error && error.response && typeof error.response === 'object') {
          const response = error.response as { status?: number, data?: { detail?: string } };
          if (response.status === 404) {
            is404 = true;
          }
          if (response.data?.detail) {
            message = response.data.detail;
          }
        } else if (error instanceof Error && error.message) {
          message = error.message;
        }
      }
      
      if (is404) {
          setError('No tenant profile is linked to your account yet.'); 
      } else {
          setError(message);
      }
      setTenantData(null); // Clear data on error
    } finally {
      setLoading(false);
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTenantDataAndOverview();
    }
  }, [user]);

  // Combined loading state for initial load
  const initialLoading = loading;

  if (initialLoading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={fetchTenantDataAndOverview}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    // If error is already set (e.g., 404), show error message
    // Otherwise, assume not linked and show EmptyTenantState
    if (error) {
       return (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg">
              <p>{error}</p>
              {/* Optionally add a button to retry or guide user */}
            </div>
          </div>
        );
    }
    // No error, but no tenant data -> show empty state 
    const emptyStateData = {
        name: user?.email?.split('@')[0] || 'User',
        email: user?.email || ''
    };
    return (
      <EmptyTenantState 
        tenant={emptyStateData}
      />
    );
  }

  // If tenantData exists, but property doesn't (adjust based on API response structure)
  // This might indicate data inconsistency or incomplete setup
  if (!tenantData.property) {
      return (
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-orange-50 text-orange-700 p-4 rounded-lg">
              <p>Your tenant profile is linked, but property details are missing. Please contact support.</p>
            </div>
          </div>
        );
  }

  // Extract property for convenience if nested
  const property = tenantData.property;

  // Placeholder click handlers for action buttons
  const handleMakePaymentClick = () => {
    console.log("Make Payment clicked");
    toast("Payment functionality not yet implemented.");
    // TODO: Implement navigation or modal opening for payment
  };

  const handleRequestMaintenanceClick = () => {
    console.log("Request Maintenance clicked");
    toast("Maintenance request functionality not yet implemented.");
    // TODO: Implement navigation or modal opening for maintenance request
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
       {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Welcome, {tenantData.name}!</h1>
           {/* Display Property Info */}
          {property && (
              <div className="text-gray-600 mt-1">
                  <p>{property.property_name}</p>
                  <p>{property.address_line1}, {property.city}</p>
              </div>
          )}
        </div>
         {/* Action Buttons */} 
        <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleMakePaymentClick}>
                  <CreditCard className="mr-2 h-4 w-4" /> Make Payment
              </Button>
               <Button variant="outline" onClick={handleRequestMaintenanceClick}>
                  <Wrench className="mr-2 h-4 w-4" /> Request Maintenance
              </Button>
        </div>
      </div>

      {/* Overview Cards Section */} 
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Next Rent Due</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                   {loadingOverview ? <span className="text-sm text-muted-foreground">Loading...</span> : (
                      <> 
                          <div className="text-2xl font-bold flex items-center">
                              {formatDate(paymentStatus?.nextDueDate)}
                              {/* Add Overdue Indicator */} 
                              {paymentStatus?.isOverdue && (
                                  <span className="ml-2 inline-block px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-full">
                                      Overdue
                                  </span>
                              )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                              Amount: ₹{paymentStatus?.nextDueAmount?.toFixed(2) ?? 'N/A'}
                          </p>
                      </>
                   )}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lease End Date</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatDate(tenantData.rental_end_date)}</div>
                  {/* Maybe add days remaining? */}
              </CardContent>
          </Card>
          <Link to="/dashboard/maintenance" className="hover:shadow-md transition-shadow duration-200 rounded-lg block">
              <Card className="h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      {loadingOverview ? <span className="text-sm text-muted-foreground">Loading...</span> : (
                          <div className="text-2xl font-bold">{openRequestsCount ?? 'N/A'}</div>
                      )}
                      <p className="text-xs text-muted-foreground">Maintenance Requests</p>
                  </CardContent>
              </Card>
          </Link>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Payment</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                   {loadingOverview ? <span className="text-sm text-muted-foreground">Loading...</span> : (
                      <> 
                          <div className="text-2xl font-bold">₹{paymentStatus?.lastPaymentAmount?.toFixed(2) ?? 'N/A'}</div>
                          <p className="text-xs text-muted-foreground">
                              Paid on: {formatDate(paymentStatus?.lastPaymentDate)}
                          </p>
                      </>
                   )}
              </CardContent>
          </Card>
      </div>

      {/* Components using tenantData */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tenantData && (
              <>
                  {/* Pass the whole tenantData object as expected by children */}
                  <LeaseDetails tenantData={tenantData} />
                  <PaymentPlans tenantData={tenantData} /> 
                  <PaymentHistory tenantData={tenantData} />
                  {/* RoommateDetails remains commented out */}
              </>
          )}
      </div>
    </div>
  );
}