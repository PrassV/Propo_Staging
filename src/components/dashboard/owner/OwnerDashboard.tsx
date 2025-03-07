import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import PropertyStats from '../PropertyStats';
import PropertyRevenue from '../PropertyRevenue';
import PropertyTable from '../PropertyTable';
import PropertyForm from '../../property/PropertyForm';
import LoadingSpinner from '../../common/LoadingSpinner';
import { Plus } from 'lucide-react';
import { PropertyFormData } from '../../../types/property';
import toast from 'react-hot-toast';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          tenants:property_tenants(
            tenant:tenants(*)
          )
        `)
        .eq('owner_id', user?.id);

      if (error) throw error;

      const formattedProperties = data.map(property => ({
        ...property,
        tenants: property.tenants?.map((pt: any) => pt.tenant) || []
      }));

      setProperties(formattedProperties);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      setError(error.message || 'Failed to fetch properties');
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      console.error('Error adding property:', error);
      toast.error(error.message || 'Failed to add property');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Dashboard</h1>
          <p className="text-gray-600">Welcome to your property management dashboard</p>
        </div>
        <button
          onClick={() => setShowPropertyForm(true)}
          className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          <span>New Property</span>
        </button>
      </div>

      <div className="space-y-6">
        <PropertyStats properties={properties} />
        <PropertyRevenue />
        
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Properties</h2>
          </div>
          <div className="bg-white rounded-lg shadow-sm">
            <PropertyTable properties={properties} onUpdate={fetchProperties} />
          </div>
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