import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tenant, TenantAssignment } from '../../api/types';
import { getTenants, createTenant, getTenantById } from '../../api/services/tenantService';
import { assignTenantToUnit, getUnitDetails, terminateLease } from '../../api/services/propertyService';
import { Textarea } from "@/components/ui/textarea";

interface AssignTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitId: string;
  unitNumber: string;
  onSuccess: () => void;
}

export default function AssignTenantModal({
  isOpen,
  onClose,
  unitId,
  unitNumber,
  onSuccess
}: AssignTenantModalProps) {
  const [loading, setLoading] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [showWarning, setShowWarning] = useState(false);
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
    dob: '',
    gender: '',
    family_size: '',
    permanent_address: '',
    rental_type: 'rent' as 'rent' | 'lease',
    rental_amount: '',
    rental_frequency: 'monthly' as 'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
  });

  // Load existing tenants when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTenants();
      checkCurrentTenant();
      resetFormData();
    }
  }, [isOpen, unitId]);

  const loadTenants = async () => {
    try {
      const response = await getTenants({});
      setTenants(response.items || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    }
  };

  const checkCurrentTenant = async () => {
    try {
      const unitDetails = await getUnitDetails(unitId);
      if (unitDetails?.current_tenant_id) {
        const tenantDetails = await getTenantById(unitDetails.current_tenant_id);
        if (tenantDetails) {
          setCurrentTenant(tenantDetails.tenant);
          setShowWarning(true);
        }
      } else {
        setCurrentTenant(null);
        setShowWarning(false);
      }
    } catch (error) {
      console.error('Error checking current tenant:', error);
      setCurrentTenant(null);
      setShowWarning(false);
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
      dob: '',
      gender: '',
      family_size: '',
      permanent_address: '',
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

    if (currentTenant && showWarning) {
      toast.error('This unit is occupied. You must terminate the existing lease first.');
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign tenant';
      
      if (errorMessage.includes('currently occupied') || errorMessage.includes('active tenant')) {
        toast.error('This unit has an active tenant. The existing tenant must be properly terminated first.');
        setShowWarning(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndAssignTenant = async () => {
    if (!newTenantData.name || !newTenantData.email || !newTenantData.rental_amount || !leaseData.lease_start) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (currentTenant && showWarning) {
        toast.error('This unit is occupied. You must terminate the existing lease first.');
        return;
    }

    setLoading(true);
    try {
      // Create tenant data with additional fields
      const tenantData = {
        name: newTenantData.name,
        email: newTenantData.email,
        phone: newTenantData.phone,
        dob: newTenantData.dob || null,
        gender: newTenantData.gender || null,
        family_size: newTenantData.family_size ? parseInt(newTenantData.family_size) : null,
        permanent_address: newTenantData.permanent_address || null,
        rental_type: newTenantData.rental_type,
        rental_frequency: newTenantData.rental_frequency,
        rental_amount: parseFloat(newTenantData.rental_amount),
        rental_start_date: leaseData.lease_start,
        rental_end_date: leaseData.lease_end || null,
        property_id: '' // This will be set by the backend based on unit
      };

      // Create the tenant first
      const createdTenantResponse = await createTenant(tenantData);
      
      if (!createdTenantResponse?.tenant) {
        throw new Error('Failed to create tenant');
      }

      // Then assign to unit with lease information
      const assignmentData: TenantAssignment = {
        tenant_id: createdTenantResponse.tenant.id,
        lease_start: leaseData.lease_start,
        lease_end: leaseData.lease_end || null,
        rent_amount: leaseData.rent_amount ? parseFloat(leaseData.rent_amount) : parseFloat(newTenantData.rental_amount),
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

  const handleTerminateAndAssign = async () => {
    if (!currentTenant) return;

    setTerminating(true);
    try {
      const terminationDate = new Date().toISOString().split('T')[0]; // Today's date
      await terminateLease(unitId, terminationDate);
      toast.success('Existing lease terminated successfully.');
      
      // Refresh tenant status
      setCurrentTenant(null);
      setShowWarning(false);

      // Now proceed with assignment
      if (activeTab === 'existing') {
        await handleAssignExistingTenant();
      } else {
        await handleCreateAndAssignTenant();
      }

    } catch (error) {
      console.error('Error terminating lease:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to terminate lease.');
    } finally {
      setTerminating(false);
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

        {currentTenant && showWarning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Unit Already Occupied</h4>
            <p className="text-sm text-yellow-700">
              This unit is currently occupied by <strong>{currentTenant.name}</strong>.
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              To assign a new tenant, you can terminate the current lease. This will set the end date to today.
            </p>
            <div className="mt-3">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleTerminateAndAssign}
                disabled={terminating || loading}
              >
                {terminating ? 'Terminating...' : 'Terminate Existing Lease & Assign New Tenant'}
              </Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'new')} className="w-full">
          <TabsList>
            <TabsTrigger value="existing">Assign Existing Tenant</TabsTrigger>
            <TabsTrigger value="new">Create New Tenant</TabsTrigger>
          </TabsList>
          <TabsContent value="existing">
            {/* Form for existing tenants */}
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <Label htmlFor="tenant-select">Select Tenant</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger id="tenant-select">
                    <SelectValue placeholder="Select an existing tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Lease details inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lease_start_existing">Lease Start Date</Label>
                  <Input 
                    id="lease_start_existing" 
                    type="date" 
                    value={leaseData.lease_start}
                    onChange={(e) => setLeaseData({ ...leaseData, lease_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lease_end_existing">Lease End Date (Optional)</Label>
                  <Input 
                    id="lease_end_existing" 
                    type="date" 
                    value={leaseData.lease_end}
                    onChange={(e) => setLeaseData({ ...leaseData, lease_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rent_amount_existing">Rent Amount</Label>
                  <Input 
                    id="rent_amount_existing" 
                    type="number" 
                    placeholder="e.g., 1500" 
                    value={leaseData.rent_amount}
                    onChange={(e) => setLeaseData({ ...leaseData, rent_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="deposit_amount_existing">Deposit Amount (Optional)</Label>
                  <Input 
                    id="deposit_amount_existing" 
                    type="number" 
                    placeholder="e.g., 1500" 
                    value={leaseData.deposit_amount}
                    onChange={(e) => setLeaseData({ ...leaseData, deposit_amount: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="new">
            {/* Form for new tenant */}
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new_tenant_name">Full Name</Label>
                  <Input 
                    id="new_tenant_name" 
                    placeholder="John Doe" 
                    value={newTenantData.name}
                    onChange={(e) => setNewTenantData({ ...newTenantData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="new_tenant_email">Email Address</Label>
                  <Input 
                    id="new_tenant_email" 
                    type="email" 
                    placeholder="john.doe@example.com"
                    value={newTenantData.email}
                    onChange={(e) => setNewTenantData({ ...newTenantData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-2 gap-4">
                  <div>
                    <Label htmlFor="new_tenant_phone">Phone Number</Label>
                    <Input 
                        id="new_tenant_phone" 
                        placeholder="+1234567890" 
                        value={newTenantData.phone}
                        onChange={(e) => setNewTenantData({ ...newTenantData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_tenant_dob">Date of Birth</Label>
                    <Input 
                        id="new_tenant_dob" 
                        type="date"
                        value={newTenantData.dob}
                        onChange={(e) => setNewTenantData({ ...newTenantData, dob: e.target.value })}
                    />
                  </div>
              </div>
              <div className="grid grid-1 gap-4">
                <Label htmlFor="permanent_address">Permanent Address</Label>
                <Textarea 
                  id="permanent_address" 
                  placeholder="123 Main St, Anytown, USA"
                  value={newTenantData.permanent_address}
                  onChange={(e) => setNewTenantData({ ...newTenantData, permanent_address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lease_start_new">Lease Start Date</Label>
                  <Input 
                    id="lease_start_new" 
                    type="date" 
                    value={leaseData.lease_start}
                    onChange={(e) => setLeaseData({ ...leaseData, lease_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lease_end_new">Lease End Date (Optional)</Label>
                  <Input 
                    id="lease_end_new" 
                    type="date" 
                    value={leaseData.lease_end}
                    onChange={(e) => setLeaseData({ ...leaseData, lease_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new_tenant_rental_amount">Rent Amount</Label>
                    <Input 
                        id="new_tenant_rental_amount" 
                        type="number"
                        placeholder="e.g. 1500"
                        value={newTenantData.rental_amount}
                        onChange={(e) => setNewTenantData({ ...newTenantData, rental_amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_tenant_rental_frequency">Rent Frequency</Label>
                    <Select 
                      value={newTenantData.rental_frequency} 
                      onValueChange={(value) => setNewTenantData({ ...newTenantData, rental_frequency: value as 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline" className="mr-2">Cancel</Button>
          <Button 
            onClick={activeTab === 'existing' ? handleAssignExistingTenant : handleCreateAndAssignTenant}
            disabled={loading || terminating || (showWarning && !!currentTenant)}
          >
            {loading ? 'Assigning...' : 'Assign Tenant'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 