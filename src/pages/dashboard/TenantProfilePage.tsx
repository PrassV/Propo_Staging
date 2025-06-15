import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Edit2, FileText, CreditCard, Wrench } from 'lucide-react';
import { Tenant } from '../../api/types';
import * as tenantService from '../../api/services/tenantService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/utils/date';

export default function TenantProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId]);

  const fetchTenant = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await tenantService.getTenantById(tenantId);
      setTenant(response.tenant);
    } catch (err: unknown) {
      console.error('Error fetching tenant:', err);
      const message = err instanceof Error ? err.message : 'Failed to load tenant details';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard/tenants');
  };

  const handleEdit = () => {
    // Navigate to edit tenant page (to be implemented)
    navigate(`/dashboard/tenants/${tenantId}/edit`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { color: 'bg-red-100 text-red-800', label: 'Inactive' },
      unassigned: { color: 'bg-yellow-100 text-yellow-800', label: 'Unassigned' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unassigned;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
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
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <button 
              onClick={fetchTenant}
              className="mt-2 text-sm underline block"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Tenant Not Found</AlertTitle>
          <AlertDescription>
            The tenant you're looking for doesn't exist or you don't have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to tenants"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">{tenant.name}</h1>
              <p className="text-gray-600">Tenant Profile</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(tenant.status || 'unassigned')}
            <button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <p className="text-gray-900">{tenant.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <p className="text-gray-900">{tenant.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  <p className="text-gray-900">{tenant.phone || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <p className="text-gray-900">{tenant.dob ? formatDate(tenant.dob) : 'Not provided'}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <p className="text-gray-900">{tenant.gender || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family Size</label>
                <p className="text-gray-900">{tenant.family_size || 'Not specified'}</p>
              </div>
            </div>
            
            {tenant.permanent_address && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address</label>
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                  <p className="text-gray-900">{tenant.permanent_address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Lease Information */}
          {tenant.rental_start_date && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Lease Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lease Start</label>
                  <p className="text-gray-900">{formatDate(tenant.rental_start_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lease End</label>
                  <p className="text-gray-900">{tenant.rental_end_date ? formatDate(tenant.rental_end_date) : 'Ongoing'}</p>
                </div>
                {tenant.rental_amount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rent Amount</label>
                    <p className="text-gray-900">₹{tenant.rental_amount} / {tenant.rent_frequency || 'month'}</p>
                  </div>
                )}
                {tenant.rental_type && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rental Type</label>
                    <p className="text-gray-900">{tenant.rental_type}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ID Proof Information */}
          {tenant.id_type && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">ID Proof</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                  <p className="text-gray-900">{tenant.id_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                  <p className="text-gray-900">{tenant.id_number || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-start px-4 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <CreditCard className="w-4 h-4 mr-3 text-gray-400" />
                <span>View Payments</span>
              </button>
              <button className="w-full flex items-center justify-start px-4 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <Wrench className="w-4 h-4 mr-3 text-gray-400" />
                <span>Maintenance Requests</span>
              </button>
              <button className="w-full flex items-center justify-start px-4 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <FileText className="w-4 h-4 mr-3 text-gray-400" />
                <span>Documents</span>
              </button>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Account Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                <p className="text-sm text-gray-900">{formatDate(tenant.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                <p className="text-sm text-gray-900">{formatDate(tenant.updated_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                {getStatusBadge(tenant.status || 'unassigned')}
              </div>
            </div>
          </div>

          {/* Responsibilities */}
          {(tenant.electricity_responsibility || tenant.water_responsibility || tenant.property_tax_responsibility) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Responsibilities</h3>
              <div className="space-y-2">
                {tenant.electricity_responsibility && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Electricity:</span>
                    <span className="text-sm font-medium">{tenant.electricity_responsibility}</span>
                  </div>
                )}
                {tenant.water_responsibility && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Water:</span>
                    <span className="text-sm font-medium">{tenant.water_responsibility}</span>
                  </div>
                )}
                {tenant.property_tax_responsibility && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Property Tax:</span>
                    <span className="text-sm font-medium">{tenant.property_tax_responsibility}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 