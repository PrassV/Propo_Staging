import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getMaintenanceRequestById } from '../../api/services/maintenanceService';
import { updateMaintenanceRequest } from '../../utils/maintenance';
import StatusTimeline from './StatusTimeline';
import RequestMessages from './RequestMessages';
import RequestInfo from './RequestInfo';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';
import { MaintenanceRequest, MaintenanceStatus } from '../../api/types';

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
    } else {
      toast.error("Maintenance request ID is missing.");
      setLoading(false);
      setRequest(null);
    }
  }, [id]);

  const fetchRequestDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getMaintenanceRequestById(id);
      setRequest(data);
    } catch (error: unknown) {
      console.error('Error fetching request details:', error);
      let errorMessage = 'Failed to load request details';
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
           errorMessage = (error.response.data as { detail: string }).detail;
      } else if (error instanceof Error) {
           errorMessage = error.message;
      }
      toast.error(errorMessage);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!id) return;
    
    const updatePayload = { status: status as MaintenanceStatus };
    
    const result = await updateMaintenanceRequest(id, updatePayload);
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