import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types/property';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TenantList from '../components/tenant/TenantList';
import toast from 'react-hot-toast';

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPropertyDetails();
    }
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          tenants:property_tenants(
            tenant:tenants(*),
            unit_number
          ),
          maintenance_requests(
            id,
            title,
            status,
            priority,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Property not found');

      // Get tax payments separately to handle if table doesn't exist yet
      const { data: taxPayments } = await supabase
        .from('tax_payments')
        .select('*')
        .eq('property_id', id)
        .order('due_date', { ascending: true });

      setProperty({
        ...data,
        tenants: data.tenants?.map((pt: any) => ({
          ...pt.tenant,
          unit_number: pt.unit_number
        })) || [],
        tax_payments: taxPayments || []
      });
    } catch (error: any) {
      console.error('Error fetching property details:', error);
      setError(error.message);
      toast.error('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error || 'Property not found'}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-2 text-sm underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-4">{property.property_name}</h1>
        <p className="text-gray-600 mb-6">
          {property.address_line1}, {property.city}, {property.state}
        </p>

        <div className="space-y-8">
          {/* Tenants Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Tenants</h2>
            <TenantList 
              tenants={property.tenants || []} 
              property={property}
              onUpdate={fetchPropertyDetails}
              showFullDetails
            />
          </div>

          {/* Maintenance Requests Section */}
          {property.maintenance_requests && property.maintenance_requests.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Maintenance Requests</h2>
              <div className="space-y-4">
                {property.maintenance_requests.map(request => (
                  <div 
                    key={request.id}
                    className="bg-gray-50 p-4 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{request.title}</h3>
                        <p className="text-sm text-gray-600">
                          Created: {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        request.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax Payments Section */}
          {property.tax_payments && property.tax_payments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Tax Payments</h2>
              <div className="space-y-4">
                {property.tax_payments.map(tax => (
                  <div 
                    key={tax.id}
                    className="bg-gray-50 p-4 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium capitalize">{tax.type} Tax</h3>
                        <p className="text-sm text-gray-600">
                          Due: {new Date(tax.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{tax.amount}</p>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          tax.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tax.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}