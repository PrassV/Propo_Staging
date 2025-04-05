import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import DashboardSummaryCards from '../../components/dashboard/DashboardSummary';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api';
import { DashboardSummary } from '../../api/types';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert';

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [revenueData, setRevenueData] = useState<Array<{month: string, amount: number}>>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch dashboard data when profile is loaded
  useEffect(() => {
    if (!profileLoading && profile) {
      fetchDashboardData();
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profileLoading, profile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch summary data
      const summaryData = await api.dashboard.getDashboardSummary();
      setDashboardData(summaryData);
      
      // Also fetch revenue data for charts if user is an owner
      const userRole = profile?.role || profile?.user_type;
      if (userRole === 'owner') {
        const revenueResponse = await api.dashboard.getRevenueData();
        setRevenueData(revenueResponse);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupProfile = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // If user is logged in but profile doesn't exist yet
  if (user && !profile) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="p-6">
          <CardContent className="pt-6 flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-4">Welcome to the Property Management Portal</h1>
            <p className="text-center mb-6">
              Please complete your profile setup to access the dashboard.
            </p>
            <Button onClick={handleSetupProfile}>
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check ROLE or USER_TYPE
  const userRole = profile?.role || profile?.user_type;
  if (!userRole) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="p-6">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold mb-4">User Role Not Set</h1>
            <p className="mb-4">
              Please complete your profile to specify your role (Owner or Tenant).
            </p>
            <Button onClick={handleSetupProfile}>
              Go to Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile.first_name || 'User'}!</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Summary Cards */}
      {dashboardData ? (
        <DashboardSummaryCards 
          summaryData={dashboardData} 
          userType={(profile.role || profile.user_type) as 'owner' | 'tenant'}
        />
      ) : (
        <div className="text-center p-4">
          <p>No dashboard data available.</p>
          <Button 
            onClick={fetchDashboardData} 
            variant="outline" 
            size="sm"
            className="mt-2"
          >
            Refresh
          </Button>
        </div>
      )}

      {/* Conditional rendering based on ROLE or USER_TYPE */}
      {userRole === 'owner' ? (
        // Owner-specific dashboard content
        <div className="space-y-6">
          {/* Revenue Chart */}
          {revenueData && revenueData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={revenueData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`$${value}`, 'Revenue']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Properties and Maintenance Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Properties</h2>
                <Button onClick={() => navigate('/dashboard/properties')}>
                  View All Properties
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Maintenance Requests</h2>
                <Button onClick={() => navigate('/dashboard/maintenance')}>
                  View All Requests
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : userRole === 'tenant' ? (
        // Tenant-specific dashboard content
        <div className="space-y-6">
          {/* Upcoming Payments Chart or Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4">
                Your next payment is due on {dashboardData?.next_due_date ? 
                  new Date(dashboardData.next_due_date).toLocaleDateString() : 
                  'Not available'}
              </p>
              {/* Add a simple payment schedule display here */}
              <Button variant="outline" onClick={() => navigate('/dashboard/payments')}>
                View Payment History
              </Button>
            </CardContent>
          </Card>

          {/* Additional Tenant Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Payment History</h2>
                <Button variant="outline" onClick={() => navigate('/dashboard/payments')}>
                  View Payments
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Maintenance</h2>
                <Button onClick={() => navigate('/dashboard/maintenance')}>
                  Request Maintenance
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <p>Dashboard view for role '{userRole}' is not available.</p>
      )}
    </div>
  );
} 