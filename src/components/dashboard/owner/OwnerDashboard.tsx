import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import PropertyTable from '../PropertyTable';
import PropertyForm from '../../property/PropertyForm';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Plus, TrendingUp, Home, Users } from 'lucide-react';
import { PropertyFormData, Property } from '../../../types/property';
import { Tenant } from '../../../types/tenant';
import toast from 'react-hot-toast';
import { getDashboardData, DashboardData } from '../../../api/services/reportService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      setPropertiesError(null);

      const { data, error } = await supabase
        .from('properties')
        .select('*, tenants:property_tenants(tenant:tenants(*))')
        .eq('owner_id', user?.id);

      if (error) throw error;

      const formattedProperties = data.map(property => ({
        ...property,
        tenants: property.tenants?.map((pt: { tenant: Tenant }) => pt.tenant) || []
      })) as Property[];

      setProperties(formattedProperties);
    } catch (error: unknown) {
      console.error('Error fetching properties:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch properties';
      setPropertiesError(message);
      toast.error(message);
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await getDashboardData();
      setDashboardData(data);
    } catch (err: unknown) {
      console.error("Error fetching dashboard overview:", err);
      setSummaryError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
      setDashboardData(null); 
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProperties();
      fetchSummary();
    }
  }, [user]);

  const handleAddProperty = async (formData: PropertyFormData) => {
    try {
      const propertyData = {
        owner_id: user?.id,
        property_name: formData.propertyName,
        property_type: formData.propertyType,
        number_of_units: formData.numberOfUnits,
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        survey_number: formData.surveyNumber,
        door_number: formData.doorNumber
      };

      const { error } = await supabase
        .from('properties')
        .insert(propertyData);

      if (error) throw error;

      toast.success('Property added successfully!');
      setShowPropertyForm(false);
      fetchProperties();
      fetchSummary();
    } catch (error: unknown) {
      console.error('Error adding property:', error);
      const message = error instanceof Error ? error.message : 'Failed to add property';
      toast.error(message);
    }
  };

  const summary = dashboardData?.summary;

  const transformedFinancialData = summary?.revenue ? [
      { name: 'Income', value: summary.revenue.monthly_rental_income },
  ] : [];

  const transformedOccupancyData = summary?.property_stats ? [
      { name: 'Occupied', value: summary.property_stats.total_rented },
      { name: 'Vacant', value: summary.property_stats.total_vacant },
  ] : [];

  const isLoading = loadingProperties || loadingSummary;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (propertiesError || summaryError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {propertiesError && <p>{propertiesError}</p>}
          {summaryError && <p>{summaryError}</p>}
          <button 
            onClick={fetchProperties}
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Dashboard</h1>
          <p className="text-gray-600">Welcome back!</p>
        </div>
        <button
          onClick={() => setShowPropertyForm(true)}
          className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          <span>New Property</span>
        </button>
      </div>

      {propertiesError && (
          <Card className="bg-destructive/10 border-destructive text-destructive-foreground">
              <CardHeader><CardTitle>Error Loading Properties</CardTitle></CardHeader>
              <CardContent><p>{propertiesError}</p></CardContent>
          </Card>
      )}
      {summaryError && (
          <Card className="bg-destructive/10 border-destructive text-destructive-foreground">
              <CardHeader><CardTitle>Error Loading Summary</CardTitle></CardHeader>
              <CardContent><p>{summaryError}</p></CardContent>
          </Card>
      )}
      
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summary?.property_stats?.total_properties ?? 'N/A'}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summary?.tenant_stats?.total_tenants ?? 'N/A'}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                   <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      {summary?.property_stats?.occupancy_rate != null 
                          ? `${summary.property_stats.occupancy_rate}%`
                          : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                      {summary?.property_stats?.total_rented ?? '-'} Rented / {summary?.property_stats?.total_properties ?? '-'} Total
                  </p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rent Collection Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" /> 
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                     {summary?.rent_collection?.collection_rate != null 
                          ? `${summary.rent_collection.collection_rate}%`
                          : 'N/A'}
                  </div>
                   <p className="text-xs text-muted-foreground">
                      ${summary?.rent_collection?.pending_current_month?.toFixed(2) ?? '-'} Pending
                  </p>
              </CardContent>
          </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Monthly Rental Income</CardTitle>
                  <CardDescription>Estimated based on active tenants</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                 {summary?.revenue && transformedFinancialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedFinancialData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                          <Bar dataKey="value" fill="#00C49F" />
                      </BarChart>
                  </ResponsiveContainer>
                  ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">{loadingSummary ? 'Loading...' : 'No income data available.'}</div>
                  )}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Unit Status</CardTitle>
                  <CardDescription>Based on property status</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                 {summary?.property_stats && summary.property_stats.total_properties > 0 && transformedOccupancyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={transformedOccupancyData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                          >
                              {transformedOccupancyData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.name === 'Occupied' ? COLORS[1] : entry.name === 'Vacant' ? COLORS[2] : COLORS[0]} />
                              ))}
                          </Pie>
                          <Tooltip />
                           <Legend />
                      </PieChart>
                  </ResponsiveContainer>
                   ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">{loadingSummary ? 'Loading...' : 'No occupancy data available.'}</div>
                  )}
              </CardContent>
          </Card>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">My Properties</h2>
        </div>
        <div className="bg-white rounded-lg shadow-sm">
            <PropertyTable properties={properties} onUpdate={fetchProperties} />
        </div>
      </div>

      {showPropertyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <PropertyForm
              onSubmit={handleAddProperty}
              onCancel={() => setShowPropertyForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}