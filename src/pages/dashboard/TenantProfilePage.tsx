import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Edit2, FileText, CreditCard, Wrench, Camera, Download, Upload, History, Settings } from 'lucide-react';
import { Tenant } from '../../api/types';
import * as tenantService from '../../api/services/tenantService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/utils/currency';
import TenantLeaseHistory from '@/components/tenant/TenantLeaseHistory';
import DocumentUploadForm from '@/components/documents/DocumentUploadForm';

// New interfaces for enhanced functionality
interface TenantDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_path: string;
  file_size?: number;
  upload_date: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  is_required: boolean;
  expiry_date?: string;
}

interface TenantHistoryItem {
  id: string;
  action: string;
  action_date: string;
  property_name?: string;
  unit_number?: string;
  rent_amount?: number;
  deposit_amount?: number;
  notes?: string;
  created_at: string;
}

interface StatusUpdateData {
  status: 'active' | 'inactive' | 'unassigned';
  reason?: string;
}

export default function TenantProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  // New state for enhanced features
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [history, setHistory] = useState<TenantHistoryItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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

  const fetchDocuments = async () => {
    if (!tenantId) return;
    
    try {
      setDocumentsLoading(true);
      const response = await tenantService.getTenantDocuments(tenantId);
      setDocuments(response.documents || []);
    } catch (err: unknown) {
      console.error('Error fetching documents:', err);
      toast.error('Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!tenantId) return;
    
    try {
      setHistoryLoading(true);
      const response = await tenantService.getTenantHistory(tenantId);
      setHistory(response.history || []);
    } catch (err: unknown) {
      console.error('Error fetching history:', err);
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStatusUpdate = async (data: StatusUpdateData) => {
    if (!tenantId) return;
    
    try {
      setStatusUpdateLoading(true);
      await tenantService.updateTenantStatus(tenantId, data.status, data.reason);
      setTenant(prev => prev ? { ...prev, status: data.status } : null);
      setStatusUpdateOpen(false);
      toast.success('Status updated successfully');
    } catch (err: unknown) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string, filename: string) => {
    try {
      const blob = await tenantService.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.error('Error downloading document:', err);
      toast.error('Failed to download document');
    }
  };

  const handleBack = () => {
    navigate('/dashboard/tenants');
  };

  const handleEdit = () => {
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
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getVerificationBadge = (status: string) => {
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-800', label: 'Verified' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
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
            <div className="flex items-center space-x-4">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {tenant.profile_photo_url ? (
                    <img 
                      src={tenant.profile_photo_url} 
                      alt={tenant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700 transition-colors">
                  <Camera className="w-3 h-3" />
                </button>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-wide">{tenant.name}</h1>
                <p className="text-gray-600">Tenant Profile</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge(tenant.status || 'unassigned')}
            <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Tenant Status</DialogTitle>
                </DialogHeader>
                <StatusUpdateForm
                  currentStatus={tenant.status || 'unassigned'}
                  onUpdate={handleStatusUpdate}
                  loading={statusUpdateLoading}
                />
              </DialogContent>
            </Dialog>
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

      {/* Enhanced Tabs Interface */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                        <p className="text-gray-900">{tenant.date_of_birth ? formatDate(tenant.date_of_birth) : tenant.dob ? formatDate(tenant.dob) : 'Not provided'}</p>
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
                </CardContent>
              </Card>

              {/* Employment Information */}
                             {tenant.occupation && (
                <Card>
                  <CardHeader>
                    <CardTitle>Employment Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                                                 <p className="text-gray-900">{tenant.occupation}</p>
                      </div>
                                             {tenant.employer_name && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employer</label>
                                                     <p className="text-gray-900">{tenant.employer_name}</p>
                        </div>
                      )}
                                             {tenant.monthly_income && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
                                                     <p className="text-gray-900">{formatCurrency(tenant.monthly_income)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Emergency Contact */}
                             {tenant.emergency_contact_name && (
                <Card>
                  <CardHeader>
                    <CardTitle>Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                                 <p className="text-gray-900">{tenant.emergency_contact_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                 <p className="text-gray-900">{tenant.emergency_contact_phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                                                 <p className="text-gray-900">{tenant.emergency_contact_relationship || 'Not specified'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Verification Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Verification Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Status</span>
                                             {getVerificationBadge(tenant.verification_status || 'pending')}
                    </div>
                                         {tenant.verification_notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                                 <p className="text-sm text-gray-600">{tenant.verification_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <CreditCard className="w-4 h-4 mr-3" />
                      <span>View Payments</span>
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Wrench className="w-4 h-4 mr-3" />
                      <span>Maintenance Requests</span>
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-3" />
                      <span>Generate Report</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentManagement
            tenantId={tenantId!}
            documents={documents}
            loading={documentsLoading}
            onRefresh={fetchDocuments}
            onDownload={handleDownloadDocument}
          />
        </TabsContent>

        <TabsContent value="leases" className="space-y-6">
          <TenantLeaseHistory
            tenantId={tenantId!}
            onRefresh={fetchTenant}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <HistoryTimeline
            tenantId={tenantId!}
            history={history}
            loading={historyLoading}
            onRefresh={fetchHistory}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <TenantActions
            tenantId={tenantId!}
            tenant={tenant}
            onTenantUpdate={fetchTenant}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Status Update Form Component
function StatusUpdateForm({ 
  currentStatus, 
  onUpdate, 
  loading 
}: { 
  currentStatus: string; 
  onUpdate: (data: StatusUpdateData) => void;
  loading: boolean;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ status: status as 'active' | 'inactive' | 'unassigned', reason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
        <Textarea 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for status change..."
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Status'}
        </Button>
      </div>
    </form>
  );
}

// Document Management Component
function DocumentManagement({
  tenantId,
  documents,
  loading,
  onRefresh,
  onDownload
}: {
  tenantId: string;
  documents: TenantDocument[];
  loading: boolean;
  onRefresh: () => void;
  onDownload: (documentId: string, filename: string) => void;
}) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    onRefresh();
  }, [tenantId]);

  const handleUploadSuccess = () => {
    setUploadDialogOpen(false);
    onRefresh();
    toast.success('Document uploaded successfully');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Documents</h2>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <DocumentUploadForm
              tenantId={tenantId}
              onUploadSuccess={handleUploadSuccess}
              onCancel={() => setUploadDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No documents uploaded</p>
          <p className="text-gray-400 text-sm mt-2">
            Upload documents for this tenant to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-gray-400" />
                    <div>
                      <h3 className="font-medium text-sm">{doc.document_name}</h3>
                      <p className="text-xs text-gray-500">{doc.document_type}</p>
                    </div>
                  </div>
                  {getVerificationBadge(doc.verification_status)}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{formatDate(doc.upload_date)}</span>
                  {doc.file_size && (
                    <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                  )}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => onDownload(doc.id, doc.document_name)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// History Timeline Component
function HistoryTimeline({
  tenantId,
  history,
  loading,
  onRefresh
}: {
  tenantId: string;
  history: TenantHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
}) {
  useEffect(() => {
    onRefresh();
  }, [tenantId]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Activity History</h2>
      
      <div className="space-y-4">
        {history.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <History className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium capitalize">{item.action.replace('_', ' ')}</h3>
                    <span className="text-sm text-gray-500">{formatDate(item.action_date)}</span>
                  </div>
                  {item.property_name && (
                    <p className="text-sm text-gray-600 mt-1">
                      Property: {item.property_name}
                      {item.unit_number && ` - Unit ${item.unit_number}`}
                    </p>
                  )}
                  {item.rent_amount && (
                    <p className="text-sm text-gray-600">
                      Rent: {formatCurrency(item.rent_amount)}
                      {item.deposit_amount && ` | Deposit: ${formatCurrency(item.deposit_amount)}`}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Tenant Actions Component
function TenantActions({
  tenantId,
  tenant,
  onTenantUpdate
}: {
  tenantId: string;
  tenant: Tenant;
  onTenantUpdate: () => void;
}) {
  const getVerificationBadge = (status: string) => {
    const statusConfig = {
      verified: { color: 'bg-green-100 text-green-800', label: 'Verified' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tenant Actions</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Lease Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start">
              <FileText className="w-4 h-4 mr-3" />
              Create New Lease
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-3" />
              View Active Leases
            </Button>
            <Button variant="outline" className="w-full justify-start text-red-600">
              <FileText className="w-4 h-4 mr-3" />
              Terminate Lease
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Communication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start">
              <Mail className="w-4 h-4 mr-3" />
              Send Email
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Phone className="w-4 h-4 mr-3" />
              Call Tenant
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-3" />
              Send Notice
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 