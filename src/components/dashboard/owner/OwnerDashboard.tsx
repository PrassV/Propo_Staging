import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import PropertyTable from '../PropertyTable';
import PropertyForm from '../../property/PropertyForm';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Plus, TrendingUp, Home, Users } from 'lucide-react';
import { PropertyFormData, Property, PropertyCreate, DashboardData } from '@/api/types';
import toast from 'react-hot-toast';
import api from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger, 
} from "@/components/ui/dialog";

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
    setLoadingProperties(true);
    setPropertiesError(null);
    try {
      const response = await api.property.getProperties();
      setProperties(response.items || []);
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
      const data = await api.dashboard.getDashboardData();
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

  const handleAddProperty = async (
    formData: PropertyFormData,
    images: File[]
  ) => {
    if (!user) {
      toast.error("Authentication error");
      return;
    }
    try {
      let imageUrl: string | undefined = undefined;

      if (images.length > 0) {
        try {
          toast.loading('Uploading images...');
          const uploadResponse = await api.property.uploadPropertyImages(images);
          toast.dismiss();
          if (uploadResponse && uploadResponse.imageUrls && uploadResponse.imageUrls.length > 0) {
            imageUrl = uploadResponse.imageUrls[0];
            toast.success('Images uploaded successfully!');
          } else {
            toast.error('Image upload failed, but proceeding without image.');
          }
        } catch (uploadError) {
          toast.dismiss();
          console.error('Error uploading images:', uploadError);
          toast.error('Image upload failed. Proceeding without image.');
        }
      }

      const propertyAPIData: PropertyCreate = {
        property_name: formData.propertyName,
        property_type: formData.propertyType,
        address_line1: formData.addressLine1,
        address_line2: formData.addressLine2 || undefined,
        city: formData.city,
        state: formData.state,
        zip_code: formData.pincode,
        country: formData.country,
        description: formData.description || undefined,
        bedrooms: formData.bedrooms || undefined,
        bathrooms: formData.bathrooms || undefined,
        area: formData.sizeSqft || undefined,
        year_built: formData.yearBuilt || undefined,
        image_url: imageUrl,
      };

      toast.loading('Creating property...');
      await api.property.createProperty(propertyAPIData);
      toast.dismiss();

      toast.success('Property added successfully!');
      setShowPropertyForm(false);
      fetchProperties();
      fetchSummary();
    } catch (error: unknown) {
      toast.dismiss();
      console.error('Error adding property:', error);
      let errorMessage = 'Failed to add property';
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
           errorMessage = (error.response.data as { detail: string }).detail;
      } else if (error instanceof Error) {
           errorMessage = error.message;
      }
      toast.error(errorMessage);
    }
  };

  const summary = dashboardData?.summary;

  const transformedOccupancyData = summary ? [
      { name: 'Occupied', value: summary.occupied_units ?? 0 },
      { name: 'Vacant', value: summary.vacant_units ?? 0 },
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
        <Dialog open={showPropertyForm} onOpenChange={setShowPropertyForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={20} className="mr-2" />
              New Property
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[80%] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
            </DialogHeader>
            <PropertyForm 
              onSubmit={async (formData, images) => {
                await handleAddProperty(formData, images);
              }} 
              onCancel={() => setShowPropertyForm(false)}
            />
          </DialogContent>
        </Dialog>
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
                  <div className="text-2xl font-bold">{summary?.total_properties ?? 'N/A'}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summary?.total_tenants ?? 'N/A'}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
                   <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      {summary?.total_properties && summary.total_properties > 0
                          ? `${((summary.occupied_units / summary.total_properties) * 100).toFixed(0)}%`
                          : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                      {summary?.occupied_units ?? '-'} Rented / {summary?.total_properties ?? '-'} Total
                  </p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Rent</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" /> 
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                     {summary?.pending_rent != null 
                          ? `$${summary.pending_rent.toFixed(2)}`
                          : 'N/A'}
                  </div>
              </CardContent>
          </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue (Current Period)</CardTitle>
                   <TrendingUp className="h-4 w-4 text-muted-foreground" /> 
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                     {summary?.total_revenue != null 
                          ? `$${summary.total_revenue.toFixed(2)}`
                          : 'N/A'}
                  </div>
              </CardContent>
          </Card>
          
          <Card>
              <CardHeader>
                  <CardTitle>Occupancy Overview</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                 {summary && transformedOccupancyData.length > 0 ? (
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
                       >
                         {transformedOccupancyData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip formatter={(value: number) => `${value} Units`} />
                       <Legend />
                     </PieChart>
                  </ResponsiveContainer>
                  ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">{loadingSummary ? 'Loading...' : 'No occupancy data.'}</div>
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
    </div>
  );
}