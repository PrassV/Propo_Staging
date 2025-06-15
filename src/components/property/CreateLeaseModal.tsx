import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Plus, User, Mail, Phone } from 'lucide-react';

import api from '@/api';
import { Tenant, TenantCreate, Lease } from '@/api/types';
import { createLease, getLeases } from '@/api/services/leaseService';
import { createTenant } from '@/api/services/tenantService';

const leaseSchema = z.object({
  tenant_id: z.string().uuid({ message: "Please select a tenant." }),
  start_date: z.string().min(1, "Start date is required."),
  end_date: z.string().min(1, "End date is required."),
  rent_amount: z.coerce.number().positive({ message: "Rent must be a positive number." }),
  deposit_amount: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: "End date must be after start date.",
  path: ["end_date"],
});

const newTenantSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
});

type LeaseFormData = z.infer<typeof leaseSchema>;
type NewTenantFormData = z.infer<typeof newTenantSchema>;

interface CreateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unitId: string;
  unitNumber: string;
}

export default function CreateLeaseModal({ isOpen, onClose, onSuccess, unitId, unitNumber }: CreateLeaseModalProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeLeaseTenantIds, setActiveLeaseTenantIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  const { control, handleSubmit, formState: { errors }, setValue, watch } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
  });

  const { control: tenantControl, handleSubmit: handleTenantSubmit, formState: { errors: tenantErrors }, reset: resetTenantForm } = useForm<NewTenantFormData>({
    resolver: zodResolver(newTenantSchema),
  });

  const selectedTenantId = watch('tenant_id');

  useEffect(() => {
    if (isOpen) {
      fetchTenants();
      fetchActiveLeaseTenants();
    }
  }, [isOpen]);

  const fetchTenants = async () => {
    try {
      // Fetch all tenants (not just unassigned) for better UX
      const tenantResponse = await api.tenant.getTenants({ limit: 1000 });
      setTenants(tenantResponse.items || []);
    } catch (error) {
      console.error("Failed to fetch tenants", error);
      toast.error("Failed to load available tenants.");
    }
  };

  const fetchActiveLeaseTenants = async () => {
    try {
      // Fetch all leases to determine which tenants are already assigned to active leases
      const leaseResponse = await getLeases({ active_only: true, limit: 1000 });
      const activeTenantIds = new Set<string>(
        (leaseResponse.items || [])
          .filter((lease: Lease) => {
            // Consider a lease active if it has no end date or end date is in the future
            return !lease.end_date || new Date(lease.end_date) > new Date();
          })
          .map((lease: Lease) => lease.tenant_id)
      );
      setActiveLeaseTenantIds(activeTenantIds);
    } catch (error) {
      console.error("Failed to fetch active leases", error);
      // Don't show error toast for this as it's not critical - we'll just show all tenants
    }
  };

  const handleAddNewTenant = () => {
    setShowAddTenantModal(true);
  };

  const handleCloseAddTenantModal = () => {
    setShowAddTenantModal(false);
    resetTenantForm();
  };

  const onCreateTenant = async (data: NewTenantFormData) => {
    setIsCreatingTenant(true);
    try {
      const tenantData: TenantCreate = {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        status: 'unassigned',
        property_id: '' // This will be set by the backend or we can pass unitId's property
      };

      const response = await createTenant(tenantData);
      
      if (response?.tenant) {
        // Add the new tenant to the list
        setTenants(prev => [response.tenant, ...prev]);
        
        // Auto-select the newly created tenant
        setValue('tenant_id', response.tenant.id);
        
        toast.success(`Tenant "${response.tenant.name}" created successfully!`);
        handleCloseAddTenantModal();
      } else {
        throw new Error('Failed to create tenant');
      }
    } catch (error) {
      console.error("Failed to create tenant:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tenant';
      toast.error("Failed to create tenant", { description: errorMessage });
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const onSubmit = async (data: LeaseFormData) => {
    setIsLoading(true);
    try {
      const leasePayload = { ...data, unit_id: unitId };
      await createLease(leasePayload);
      toast.success(`Lease created for Unit ${unitNumber}!`);
      onSuccess();
      onClose();
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Failed to create lease:", error);
      toast.error("Failed to create lease.", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Get available tenants (filter out those already assigned to active leases)
  const availableTenants = tenants.filter(tenant => 
    !activeLeaseTenantIds.has(tenant.id)
  );

  return (
    <>
      {/* Main Lease Creation Modal */}
      <Dialog open={isOpen && !showAddTenantModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Lease for Unit {unitNumber}</DialogTitle>
            <DialogDescription>
              Assign a tenant and define the lease terms for this unit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tenant_id">Tenant</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Controller
                    name="tenant_id"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tenant..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTenants.length === 0 ? (
                            <SelectItem value="no-tenants" disabled>
                              No available tenants
                            </SelectItem>
                          ) : (
                            availableTenants.map(tenant => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4" />
                                  <span>{tenant.name} ({tenant.email})</span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    tenant.status === 'unassigned' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {tenant.status}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddNewTenant}
                  title="Add new tenant"
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {errors.tenant_id && <p className="text-sm text-red-500">{errors.tenant_id.message}</p>}
              
              {/* Show selected tenant info */}
              {selectedTenantId && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  {(() => {
                    const selectedTenant = tenants.find(t => t.id === selectedTenantId);
                    return selectedTenant ? (
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">{selectedTenant.name}</p>
                          <p className="text-sm text-blue-700">{selectedTenant.email}</p>
                          {selectedTenant.phone && (
                            <p className="text-sm text-blue-700">{selectedTenant.phone}</p>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Controller
                  name="start_date"
                  control={control}
                  render={({ field }) => <Input id="start_date" type="date" {...field} />}
                />
                {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <Controller
                  name="end_date"
                  control={control}
                  render={({ field }) => <Input id="end_date" type="date" {...field} />}
                />
                {errors.end_date && <p className="text-sm text-red-500">{errors.end_date.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rent_amount">Rent Amount ($)</Label>
                <Controller
                  name="rent_amount"
                  control={control}
                  render={({ field }) => <Input id="rent_amount" type="number" step="0.01" {...field} value={field.value || ''} />}
                />
                {errors.rent_amount && <p className="text-sm text-red-500">{errors.rent_amount.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deposit_amount">Deposit Amount ($)</Label>
                <Controller
                  name="deposit_amount"
                  control={control}
                  render={({ field }) => <Input id="deposit_amount" type="number" step="0.01" {...field} value={field.value || ''} />}
                />
                {errors.deposit_amount && <p className="text-sm text-red-500">{errors.deposit_amount.message}</p>}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Controller
                name="notes"
                control={control}
                render={({ field }) => <Textarea id="notes" placeholder="Any additional notes about the lease..." {...field} />}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
              <Button type="submit" disabled={isLoading || !selectedTenantId}>
                {isLoading ? "Creating..." : "Create Lease"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Tenant Modal */}
      <Dialog open={showAddTenantModal} onOpenChange={handleCloseAddTenantModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add New Tenant</span>
            </DialogTitle>
            <DialogDescription>
              Create a new tenant profile. They will be automatically selected for the lease.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTenantSubmit(onCreateTenant)} className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <User className="w-4 h-4" />
                <span>Basic Information</span>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="tenant_name">Full Name *</Label>
                <Controller
                  name="name"
                  control={tenantControl}
                  render={({ field }) => (
                    <Input 
                      id="tenant_name" 
                      placeholder="Enter tenant's full name" 
                      {...field} 
                    />
                  )}
                />
                {tenantErrors.name && <p className="text-sm text-red-500">{tenantErrors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tenant_email">Email Address *</Label>
                  <Controller
                    name="email"
                    control={tenantControl}
                    render={({ field }) => (
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                          id="tenant_email" 
                          type="email"
                          placeholder="tenant@example.com" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    )}
                  />
                  {tenantErrors.email && <p className="text-sm text-red-500">{tenantErrors.email.message}</p>}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="tenant_phone">Phone Number</Label>
                  <Controller
                    name="phone"
                    control={tenantControl}
                    render={({ field }) => (
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                          id="tenant_phone" 
                          type="tel"
                          placeholder="(555) 123-4567" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleCloseAddTenantModal} disabled={isCreatingTenant}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingTenant}>
                {isCreatingTenant ? "Creating..." : "Create Tenant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
} 