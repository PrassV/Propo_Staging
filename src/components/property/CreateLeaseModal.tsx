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

import api from '@/api';
import { Tenant } from '@/api/types';
import { createLease } from '@/api/services/leaseService';

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

type LeaseFormData = z.infer<typeof leaseSchema>;

interface CreateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unitId: string;
  unitNumber: string;
}

export default function CreateLeaseModal({ isOpen, onClose, onSuccess, unitId, unitNumber }: CreateLeaseModalProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch available tenants when modal opens
      const fetchTenants = async () => {
        try {
          // Assuming you have an API function to get all tenants
          const tenantResponse = await api.tenant.getTenants({ limit: 1000, status: 'unassigned' });
          setTenants(tenantResponse.items || []);
        } catch (error) {
          console.error("Failed to fetch tenants", error);
          toast.error("Failed to load available tenants.");
        }
      };
      fetchTenants();
    }
  }, [isOpen]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Lease for Unit {unitNumber}</DialogTitle>
          <DialogDescription>
            Assign a tenant and define the lease terms for this unit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tenant_id">Tenant</Label>
            <Controller
              name="tenant_id"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tenant_id && <p className="text-sm text-red-500">{errors.tenant_id.message}</p>}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Lease"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 