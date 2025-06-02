import { useState, useEffect } from 'react';
import { X, Plus, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tenant, TenantAssignment } from '../../api/types';
import { getTenants, createTenant } from '../../api/services/tenantService';
import { assignTenantToUnit } from '../../api/services/propertyService';

interface AssignTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  propertyId: string;
  unitNumber: string;
  onSuccess: () => void;
}

export default function AssignTenantModal({
  isOpen,
  onClose,
  unitId,
  propertyId,
  unitNumber,
  onSuccess
}: AssignTenantModalProps) {
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [leaseData, setLeaseData] = useState({
    lease_start: '',
    lease_end: '',
    rent_amount: '',
    deposit_amount: ''
  });

  // New tenant form data
  const [newTenantData, setNewTenantData] = useState({
    name: '',
    email: '',
    phone: '',
    rental_type: 'rent' as 'rent' | 'lease',
    rental_amount: '',
    rental_frequency: 'monthly' as 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  });

  // Load existing tenants when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTenants();
      resetFormData();
    }
  }, [isOpen]);

  const loadTenants = async () => {
    try {
      const response = await getTenants();
      // Handle TenantsListResponse structure
      setTenants(response.items || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    }
  };

  const resetFormData = () => {
    setSelectedTenantId('');
    setLeaseData({
      lease_start: '',
      lease_end: '',
      rent_amount: '',
      deposit_amount: ''
    });
    setNewTenantData({
      name: '',
      email: '',
      phone: '',
      rental_type: 'rent',
      rental_amount: '',
      rental_frequency: 'monthly'
    });
    setActiveTab('existing');
  };

  const handleAssignExistingTenant = async () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    if (!leaseData.lease_start || !leaseData.rent_amount) {
      toast.error('Please fill in lease start date and rent amount');
      return;
    }

    setLoading(true);
    try {
      const assignmentData: TenantAssignment = {
        tenant_id: selectedTenantId,
        lease_start: leaseData.lease_start,
        lease_end: leaseData.lease_end || null,
        rent_amount: parseFloat(leaseData.rent_amount),
        deposit_amount: leaseData.deposit_amount ? parseFloat(leaseData.deposit_amount) : null
      };

      await assignTenantToUnit(unitId, assignmentData);
      toast.success('Tenant assigned successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error assigning tenant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAssignTenant = async () => {
    if (!newTenantData.name || !newTenantData.email || !newTenantData.rental_amount || !leaseData.lease_start) {
      toast.error('Please fill in all required fields (name, email, rental amount, and lease start date)');
      return;
    }

    setLoading(true);
    try {
      // First create the tenant
      const tenantCreateData = {
        name: newTenantData.name,
        email: newTenantData.email,
        phone: newTenantData.phone,
        property_id: propertyId,
        rental_start_date: leaseData.lease_start,
        rental_end_date: leaseData.lease_end,
        rental_type: newTenantData.rental_type,
        rental_amount: parseFloat(newTenantData.rental_amount),
        rental_frequency: newTenantData.rental_frequency
      };

      const createdTenantResponse = await createTenant(tenantCreateData);

      const assignmentData: TenantAssignment = {
        tenant_id: createdTenantResponse.tenant.id,
        lease_start: leaseData.lease_start,
        lease_end: leaseData.lease_end || null,
        rent_amount: parseFloat(newTenantData.rental_amount),
        deposit_amount: leaseData.deposit_amount ? parseFloat(leaseData.deposit_amount) : null
      };

      await assignTenantToUnit(unitId, assignmentData);
      toast.success('Tenant created and assigned successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating and assigning tenant:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create and assign tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Assign Tenant to Unit {unitNumber}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center space-x-2">
              <User size={16} />
              <span>Assign Existing Tenant</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center space-x-2">
              <Plus size={16} />
              <span>Create New Tenant</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="tenant-select">Select Tenant</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lease-start">Lease Start Date *</Label>
                  <Input
                    id="lease-start"
                    type="date"
                    value={leaseData.lease_start}
                    onChange={(e) => setLeaseData({...leaseData, lease_start: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lease-end">Lease End Date</Label>
                  <Input
                    id="lease-end"
                    type="date"
                    value={leaseData.lease_end}
                    onChange={(e) => setLeaseData({...leaseData, lease_end: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rent-amount">Monthly Rent Amount *</Label>
                  <Input
                    id="rent-amount"
                    type="number"
                    placeholder="0.00"
                    value={leaseData.rent_amount}
                    onChange={(e) => setLeaseData({...leaseData, rent_amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deposit-amount">Security Deposit</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.00"
                    value={leaseData.deposit_amount}
                    onChange={(e) => setLeaseData({...leaseData, deposit_amount: e.target.value})}
                  />
                </div>
              </div>

              <Button 
                onClick={handleAssignExistingTenant}
                disabled={loading || !selectedTenantId}
                className="w-full"
              >
                {loading ? 'Assigning...' : 'Assign Tenant'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-tenant-name">Full Name *</Label>
                  <Input
                    id="new-tenant-name"
                    value={newTenantData.name}
                    onChange={(e) => setNewTenantData({...newTenantData, name: e.target.value})}
                    placeholder="Enter tenant name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-tenant-email">Email *</Label>
                  <Input
                    id="new-tenant-email"
                    type="email"
                    value={newTenantData.email}
                    onChange={(e) => setNewTenantData({...newTenantData, email: e.target.value})}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-tenant-phone">Phone Number</Label>
                  <Input
                    id="new-tenant-phone"
                    value={newTenantData.phone}
                    onChange={(e) => setNewTenantData({...newTenantData, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="rental-type">Rental Type</Label>
                  <Select 
                    value={newTenantData.rental_type} 
                    onValueChange={(value) => setNewTenantData({...newTenantData, rental_type: value as 'rent' | 'lease'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rental</SelectItem>
                      <SelectItem value="lease">Lease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rental-amount">Rental Amount *</Label>
                  <Input
                    id="rental-amount"
                    type="number"
                    placeholder="0.00"
                    value={newTenantData.rental_amount}
                    onChange={(e) => setNewTenantData({...newTenantData, rental_amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rental-frequency">Payment Frequency</Label>
                  <Select 
                    value={newTenantData.rental_frequency} 
                    onValueChange={(value) => setNewTenantData({...newTenantData, rental_frequency: value as 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-lease-start">Lease Start Date *</Label>
                  <Input
                    id="new-lease-start"
                    type="date"
                    value={leaseData.lease_start}
                    onChange={(e) => setLeaseData({...leaseData, lease_start: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-lease-end">Lease End Date</Label>
                  <Input
                    id="new-lease-end"
                    type="date"
                    value={leaseData.lease_end}
                    onChange={(e) => setLeaseData({...leaseData, lease_end: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-deposit-amount">Security Deposit</Label>
                  <Input
                    id="new-deposit-amount"
                    type="number"
                    placeholder="0.00"
                    value={leaseData.deposit_amount}
                    onChange={(e) => setLeaseData({...leaseData, deposit_amount: e.target.value})}
                  />
                </div>
                <div>
                  {/* Placeholder for another field if needed */}
                </div>
              </div>

              <Button 
                onClick={handleCreateAndAssignTenant}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? 'Creating...' : 'Create & Assign Tenant'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 