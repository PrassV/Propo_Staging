import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { updateMaintenanceRequest } from '../../utils/maintenance';
import StatusTimeline from './StatusTimeline';
import RequestMessages from './RequestMessages';
import RequestInfo from './RequestInfo';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
    }
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          property:properties(
            id,
            property_name,
            address_line1,
            city
          ),
          tenant:tenants(
            id,
            name,
            email,
            phone
          ),
          vendor:maintenance_vendors(
            id,
            name,
            phone,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!id) return;

    const result = await updateMaintenanceRequest(id, { status });
    if (result.success) {
      toast.success('Status updated successfully');
      fetchRequestDetails();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Request not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/dashboard/maintenance')}
        className="flex items-center text-gray-600 hover:text-black mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Maintenance
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RequestInfo request={request} />
          <RequestMessages requestId={request.id} />
        </div>
        
        <div className="space-y-6">
          <StatusTimeline 
            request={request}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      </div>
    </div>
  );
}