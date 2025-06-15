import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Users, UserCheck, UserX, Eye, BarChart3 } from 'lucide-react';
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BulkOperationsPanel from '../../components/tenant/BulkOperationsPanel';
import TenantAnalytics from '../../components/tenant/TenantAnalytics';
import { toast } from 'sonner';

export default function TenantsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTenants, setSelectedTenants] = useState<Tenant[]>([]);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'unassigned'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
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

      console.log('Fetching tenants with params:', params);
      console.log('User authenticated:', !!user);

      const response = await tenantService.getTenants(params);
      setTenants(response.items);
      setTotalCount(response.total);
    } catch (err: unknown) {
      console.error('Error fetching tenants:', err);
      let message = 'Failed to load tenants';
      
      if (err instanceof Error) {
        message = err.message;
        if (message.includes('authentication') || message.includes('token')) {
          message = 'Authentication failed. Please log out and log back in.';
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

  // Bulk operations handlers
  const handleSelectTenant = (tenant: Tenant, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTenants(prev => [...prev, tenant]);
    } else {
      setSelectedTenants(prev => prev.filter(t => t.id !== tenant.id));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedTenants(tenants);
    } else {
      setSelectedTenants([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedTenants([]);
  };

  const handleBulkUpdate = async (tenantIds: string[], updates: Record<string, unknown>) => {
    try {
      // In a real implementation, you would call a bulk update API
      // For now, we'll update each tenant individually
      const updatePromises = tenantIds.map(id => 
        tenantService.updateTenant(id, updates)
      );
      
      await Promise.all(updatePromises);
      await fetchTenants(); // Refresh the list
      setSelectedTenants([]); // Clear selection
      toast.success(`Successfully updated ${tenantIds.length} tenants`);
    } catch (error) {
      console.error('Bulk update error:', error);
      throw error;
    }
  };

  const handleBulkNotify = async (tenantIds: string[], notificationData: { subject: string; message: string; type: string; priority: string }) => {
    try {
      // Create notifications for each tenant
      const notificationPromises = tenantIds.map(tenantId => 
        notificationService.createNotification({
          user_id: tenantId,
          title: notificationData.subject,
          message: notificationData.message,
          type: 'tenant_communication'
        })
      );
      
      await Promise.all(notificationPromises);
      toast.success(`Notifications sent to ${tenantIds.length} tenants`);
    } catch (error) {
      console.error('Bulk notification error:', error);
      throw error;
    }
  };

  const handleExport = async (tenantIds: string[]) => {
    try {
      // In a real implementation, this would call an export API
      // For now, we'll create a CSV export
      const selectedTenantsData = tenants.filter(t => tenantIds.includes(t.id));
      
      const csvContent = [
        ['Name', 'Email', 'Phone', 'Status', 'Rent Amount', 'Start Date', 'End Date'].join(','),
        ...selectedTenantsData.map(tenant => [
          tenant.name,
          tenant.email,
          tenant.phone || '',
          tenant.status || 'unassigned',
          tenant.rental_amount || 0,
          tenant.rental_start_date || '',
          tenant.rental_end_date || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenants_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: UserCheck, label: 'Active' },
      inactive: { color: 'bg-red-100 text-red-800', icon: UserX, label: 'Inactive' },
      unassigned: { color: 'bg-yellow-100 text-yellow-800', icon: Users, label: 'Unassigned' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unassigned;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const isAllSelected = tenants.length > 0 && selectedTenants.length === tenants.length;
  const isPartiallySelected = selectedTenants.length > 0 && selectedTenants.length < tenants.length;

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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-wide">Tenants</h1>
            <p className="text-gray-600">Manage all your tenants in one place</p>
          </div>
          <button
            onClick={handleAddTenant}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Tenant</span>
          </button>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      <BulkOperationsPanel
        selectedTenants={selectedTenants}
        onClearSelection={handleClearSelection}
        onBulkUpdate={handleBulkUpdate}
        onBulkNotify={handleBulkNotify}
        onExport={handleExport}
      />

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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search tenants by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </form>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tenants List */}
          <div className="bg-white rounded-lg shadow-sm">
            {tenants.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Get started by adding your first tenant'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={handleAddTenant}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Tenant</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isPartiallySelected;
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">Tenant</div>
                    <div className="col-span-2">Contact</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Added</div>
                    <div className="col-span-1">Lease Info</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-200">
                  {tenants.map((tenant) => {
                    const isSelected = selectedTenants.some(t => t.id === tenant.id);
                    return (
                      <div key={tenant.id} className={`px-6 py-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Checkbox */}
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectTenant(tenant, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </div>

                          {/* Tenant Info */}
                          <div className="col-span-3">
                            <div className="flex items-center space-x-3">
                              <div className="bg-blue-100 p-2 rounded-full">
                                <Users className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{tenant.name}</p>
                                <p className="text-sm text-gray-500">{tenant.email}</p>
                              </div>
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="col-span-2">
                            <p className="text-sm text-gray-900">{tenant.phone || 'No phone'}</p>
                          </div>

                          {/* Status */}
                          <div className="col-span-2">
                            {getStatusBadge(tenant.status || 'unassigned')}
                          </div>

                          {/* Added Date */}
                          <div className="col-span-2">
                            <p className="text-sm text-gray-900">{formatDate(tenant.created_at)}</p>
                          </div>

                          {/* Lease Info */}
                          <div className="col-span-1">
                            {tenant.rental_start_date ? (
                              <div className="text-sm">
                                <p className="text-gray-900">
                                  {formatDate(tenant.rental_start_date)} - {tenant.rental_end_date ? formatDate(tenant.rental_end_date) : 'Ongoing'}
                                </p>
                                {tenant.rental_amount && (
                                  <p className="text-gray-500">₹{tenant.rental_amount}/{tenant.rent_frequency || 'month'}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No lease</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="col-span-1">
                            <button
                              onClick={() => {
                                if (tenant.id) {
                                  handleViewTenant(tenant.id);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                              title="View tenant details"
                              disabled={!tenant.id}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tenants
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
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
                onValueChange={(value) => setNewTenantData({ ...newTenantData, tenant_type: value as 'individual' | 'company' })}
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