import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Users, 
  UserCheck, 
  UserX, 
  Eye, 
  BarChart3, 
  MapPin, 
  Calendar,
  Phone,
  Mail,
  Home,
  Building,
  IndianRupee,
  Clock,
  Star,
  AlertCircle
} from 'lucide-react';
import { Tenant } from '../../api/types';
import * as tenantService from '../../api/services/tenantService';
import * as notificationService from '../../api/services/notificationService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/utils/date';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import TenantAnalytics from '../../components/tenant/TenantAnalytics';
import { toast } from 'react-hot-toast';

export default function TenantsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'unassigned'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // Increased for card layout
  const [activeTab, setActiveTab] = useState('list');

  // Add Tenant Modal state
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [newTenantData, setNewTenantData] = useState({
    name: '',
    email: '',
    phone: '',
    tenant_type: 'individual' as 'individual' | 'company'
  });

  // Fetch tenants
  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication first
      if (!user) {
        setError('You must be logged in to view tenants.');
        return;
      }

      const params = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined,
        sort_by: 'created_at',
        sort_order: 'desc' as const
      };

      const response = await tenantService.getTenants(params);
      console.log('API Response:', response);
      console.log('Response items:', response.items);
      console.log('Response total:', response.total);
      setTenants(response.items || []);
      setTotalCount(response.total || 0);
    } catch (err: unknown) {
      console.error('Error fetching tenants:', err);
      let message = 'Failed to load tenants';
      
      if (err instanceof Error) {
        message = err.message;
        if (message.includes('authentication') || message.includes('token')) {
          message = 'Authentication failed. Please log out and log back in.';
        }
      }
      
      // Add more detailed error information
      if (typeof err === 'object' && err !== null) {
        console.error('Error details:', {
          message: (err as any).message,
          response: (err as any).response,
          status: (err as any).response?.status,
          data: (err as any).response?.data
        });
        
        // Check if it's a network error
        if ((err as any).code === 'NETWORK_ERROR' || (err as any).message?.includes('Network Error')) {
          message = 'Cannot connect to server. Please check if the backend is running.';
        }
      }
      
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (user) {
      fetchTenants();
    }
  }, [user, currentPage, statusFilter, searchTerm]);

  // Event handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchTenants();
  };

  const handleStatusFilterChange = (status: typeof statusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleAddTenant = () => {
    setShowAddTenantModal(true);
  };

  const handleCreateTenant = async () => {
    if (!newTenantData.name.trim() || !newTenantData.email.trim()) {
      toast.error('Name and Email are required fields.');
      return;
    }

    setIsCreatingTenant(true);
    try {
      const tenantData = {
        name: newTenantData.name.trim(),
        email: newTenantData.email.trim(),
        phone: newTenantData.phone.trim() || '',
        tenant_type: newTenantData.tenant_type,
        property_id: '', // Will be set by backend or can be empty for standalone tenant
      };

      await tenantService.createTenant(tenantData);
      toast.success('Tenant created successfully!');
      setShowAddTenantModal(false);
      setNewTenantData({ name: '', email: '', phone: '', tenant_type: 'individual' });
      await fetchTenants(); // Refresh the list
    } catch (error) {
      console.error('Error creating tenant:', error);
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('token')) {
          toast.error('Authentication failed. Please log out and log back in.');
        } else {
          toast.error(`Failed to create tenant: ${error.message}`);
        }
      } else {
        toast.error('Failed to create tenant. Please check your connection and try again.');
      }
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleViewTenant = (tenantId: string) => {
    navigate(`/dashboard/tenants/${tenantId}`);
  };



  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: UserCheck, 
        label: 'Active' 
      },
      inactive: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: UserX, 
        label: 'Inactive' 
      },
      unassigned: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: AlertCircle, 
        label: 'Unassigned' 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unassigned;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Loading state
  if (loading && tenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <button 
              onClick={fetchTenants}
              className="mt-2 text-sm underline block"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
            <p className="text-gray-600 mt-1">Manage all your tenants in one place</p>
          </div>
          <Button
            onClick={handleAddTenant}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Tenant</span>
          </Button>
        </div>
      </div>



      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tenant List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Search and Filters */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Search tenants by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </form>

                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Select
                    value={statusFilter}
                    onValueChange={(value: string) => handleStatusFilterChange(value as typeof statusFilter)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenants Grid */}
          <div className="space-y-4">
            {tenants.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'Get started by adding your first tenant'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button
                      onClick={handleAddTenant}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Tenant</span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Select All Header */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    Showing {tenants.length} of {totalCount} tenants
                  </div>
                </div>

                {/* Tenant Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tenants.map((tenant) => {
                    return (
                      <Card key={tenant.id} className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                                  {getInitials(tenant.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{tenant.name}</h3>
                                <div className="flex items-center space-x-1 text-sm text-gray-500">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate">{tenant.email}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(tenant.status || 'unassigned')}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          {/* Contact Info */}
                          {tenant.phone && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                              <Phone className="w-3 h-3" />
                              <span>{tenant.phone}</span>
                            </div>
                          )}

                          {/* Property/Unit Assignment */}
                          <div className="space-y-3 mb-4">
                            {tenant.current_property ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-start space-x-2">
                                  <Home className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-green-900 truncate">
                                      {tenant.current_property.property_name}
                                    </p>
                                    <div className="flex items-center space-x-1 text-sm text-green-700">
                                      <MapPin className="w-3 h-3" />
                                      <span>{tenant.current_property.city}, {tenant.current_property.state}</span>
                                    </div>
                                    {tenant.current_unit && (
                                      <div className="flex items-center space-x-1 text-sm text-green-700 mt-1">
                                        <Building className="w-3 h-3" />
                                        <span>Unit: {tenant.current_unit.unit_number}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center space-x-2">
                                  <AlertCircle className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm text-gray-600">No active assignment</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Lease/Rental Info */}
                          {(tenant.current_lease || tenant.rental_start_date) && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                              <div className="flex items-start space-x-2">
                                <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  {tenant.current_lease ? (
                                    <>
                                      <p className="text-sm font-medium text-blue-900">
                                        {formatDate(tenant.current_lease.start_date)} - {tenant.current_lease.end_date ? formatDate(tenant.current_lease.end_date) : 'Ongoing'}
                                      </p>
                                      {tenant.current_lease.rent_amount && (
                                        <div className="flex items-center space-x-1 text-sm text-blue-700 mt-1">
                                          <IndianRupee className="w-3 h-3" />
                                          <span>₹{tenant.current_lease.rent_amount}/month</span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium text-blue-900">
                                        {formatDate(tenant.rental_start_date)} - {tenant.rental_end_date ? formatDate(tenant.rental_end_date) : 'Ongoing'}
                                      </p>
                                      {tenant.rental_amount && (
                                        <div className="flex items-center space-x-1 text-sm text-blue-700 mt-1">
                                          <IndianRupee className="w-3 h-3" />
                                          <span>₹{tenant.rental_amount}/{tenant.rent_frequency || 'month'}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Added Date */}
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Added {formatDate(tenant.created_at)}</span>
                            </div>
                          </div>

                          {/* Action Button */}
                                                     <button
                             onClick={() => {
                               if (tenant.id) {
                                 handleViewTenant(tenant.id);
                               }
                             }}
                             className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                             disabled={!tenant.id}
                           >
                             <Eye className="w-4 h-4 mr-2" />
                             View Details
                           </button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tenants
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="px-3 py-1 text-sm flex items-center">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <TenantAnalytics tenants={tenants} />
        </TabsContent>
      </Tabs>

      {/* Add Tenant Modal */}
      <Dialog open={showAddTenantModal} onOpenChange={setShowAddTenantModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_name">Full Name *</Label>
              <Input
                id="tenant_name"
                placeholder="Enter tenant's full name"
                value={newTenantData.name}
                onChange={(e) => setNewTenantData({ ...newTenantData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_email">Email Address *</Label>
              <Input
                id="tenant_email"
                type="email"
                placeholder="Enter tenant's email"
                value={newTenantData.email}
                onChange={(e) => setNewTenantData({ ...newTenantData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_phone">Phone Number</Label>
              <Input
                id="tenant_phone"
                type="tel"
                placeholder="Enter tenant's phone number"
                value={newTenantData.phone}
                onChange={(e) => setNewTenantData({ ...newTenantData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_type">Tenant Type</Label>
              <Select
                value={newTenantData.tenant_type}
                onValueChange={(value: string) => setNewTenantData({ ...newTenantData, tenant_type: value as 'individual' | 'company' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddTenantModal(false)}
                disabled={isCreatingTenant}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTenant}
                disabled={isCreatingTenant}
              >
                {isCreatingTenant ? 'Creating...' : 'Create Tenant'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}