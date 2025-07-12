import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import EnhancedTenantOnboardingForm from '../../components/onboarding/tenant/EnhancedTenantOnboardingForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import api from '../../api';
import { PropertyDetails } from '../../api/types';

export default function AddTenantPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property');
  const unitId = searchParams.get('unit');
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails(propertyId);
    } else {
      setLoadingProperty(false);
      setError('No property specified.');
      toast.error('No property specified in URL.');
      navigate('/dashboard');
    }
    if (!unitId) {
       console.warn('No unit specified for adding tenant.');
       toast('No unit specified. Tenant form might need adjustment.', { icon: '⚠️' });
    }
  }, [propertyId, unitId, navigate]);

  const fetchPropertyDetails = async (id: string) => {
    setLoadingProperty(true);
    setError(null);
    try {
      const fetchedProperty = await api.property.getPropertyById(id);
      setProperty(fetchedProperty); 
    } catch (err: unknown) {
      console.error('Error fetching property details:', err);
      let errorMessage = 'Failed to load property details';
       if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'formattedMessage' in err) {
        errorMessage = (err as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      navigate('/dashboard');
    } finally {
      setLoadingProperty(false);
    }
  };

  const handleTenantAdded = () => {
     toast.success('Tenant added successfully!');
     navigate(`/property/${propertyId}`);
  };

  if (loadingProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !property || !propertyId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-black mb-6">
            <ArrowLeft size={20} className="mr-2" /> Back to Dashboard
        </button>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error || 'Property not found or invalid ID.'}</p>
        </div>
      </div>
    );
  }
  
  if (!unitId) {
     return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate(`/property/${propertyId}`)} className="flex items-center text-gray-600 hover:text-black mb-6">
            <ArrowLeft size={20} className="mr-2" /> Back to Property
        </button>
        <div className="bg-yellow-50 text-yellow-600 p-4 rounded-lg">
          <p>Cannot add tenant: No specific unit ID was provided in the URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/property/${propertyId}`)}
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Property Details
      </button>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Add New Tenant</h1>
        <p className="text-gray-600 mb-8">
          Adding tenant to property: <strong>{property.property_name}</strong> (Unit ID: {unitId})
        </p>

        <EnhancedTenantOnboardingForm />
      </div>
    </div>
  );
}