import React, { useState, useEffect } from 'react';
import { LeaseAgreement } from '@/api/types';
import { getLeaseByUnitId, createLease, updateLease } from '@/api/services/leaseService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/use-toast";

interface LeaseInfoTabProps {
  unitId: string;
}

export default function LeaseInfoTab({ unitId }: LeaseInfoTabProps) {
  const [lease, setLease] = useState<LeaseAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    tenant_id: '',
    start_date: new Date(),
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    rent_amount: '',
    deposit_amount: '',
    rent_frequency: 'monthly'
  });

  useEffect(() => {
    const fetchLease = async () => {
      if (!unitId) return;
      setLoading(true); setError(null);
      try {
        // Use imported service function
        const data = await getLeaseByUnitId(unitId);
        setLease(data); // API service returns LeaseAgreement or null

        // If lease exists, initialize form data for editing
        if (data) {
          setFormData({
            tenant_id: data.tenant_id,
            start_date: new Date(data.start_date),
            end_date: data.end_date ? new Date(data.end_date) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            rent_amount: data.rent_amount.toString(),
            deposit_amount: data.deposit_amount.toString(),
            rent_frequency: data.rent_frequency
          });
        }
      } catch (err) {
        console.error("Error fetching lease:", err);
        setError(err instanceof Error ? err.message : 'Failed to load lease details.');
        setLease(null); // Clear lease on error
      }
      finally { setLoading(false); }
    };
    fetchLease();
  }, [unitId]);

  const handleCreateLease = () => {
    setCreateDialogOpen(true);
  };

  const handleEditLease = () => {
    setEditDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined, name: string) => {
    if (!date) return;
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleCreateSubmit = async () => {
    if (!formData.tenant_id || !formData.start_date || !formData.rent_amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await createLease({
        unit_id: unitId,
        tenant_id: formData.tenant_id,
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date.toISOString().split('T')[0],
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: parseFloat(formData.deposit_amount || '0'),
        rent_frequency: formData.rent_frequency
      });

      toast({
        title: "Success",
        description: "Lease created successfully"
      });

      // Reset form and close dialog
      setFormData({
        tenant_id: '',
        start_date: new Date(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        rent_amount: '',
        deposit_amount: '',
        rent_frequency: 'monthly'
      });
      setCreateDialogOpen(false);

      // Refresh the lease data
      const data = await getLeaseByUnitId(unitId);
      setLease(data);
    } catch (err) {
      console.error("Error creating lease:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create lease',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!lease || !formData.start_date || !formData.rent_amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateLease(lease.id, {
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date.toISOString().split('T')[0],
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: parseFloat(formData.deposit_amount || '0'),
        rent_frequency: formData.rent_frequency
      });

      toast({
        title: "Success",
        description: "Lease updated successfully"
      });

      setEditDialogOpen(false);

      // Refresh the lease data
      const data = await getLeaseByUnitId(unitId);
      setLease(data);
    } catch (err) {
      console.error("Error updating lease:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update lease',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="text-sm text-destructive">Error: {error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Lease Information</h3>
        {lease ? (
          <Button size="sm" variant="outline" onClick={handleEditLease}>
            <Edit className="mr-2 h-4 w-4" /> Edit Lease
          </Button>
        ) : (
          <Button size="sm" onClick={handleCreateLease}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Lease
          </Button>
        )}
      </div>

      {lease ? (
        <div className="space-y-2">
          <p><strong className="font-medium">Status:</strong> <span className="capitalize">{lease.status}</span></p>
          <p><strong className="font-medium">Term:</strong> {new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}</p>
          <p><strong className="font-medium">Rent:</strong> ${lease.rent_amount} / {lease.rent_frequency}</p>
          <p><strong className="font-medium">Deposit:</strong> ${lease.deposit_amount}</p>
          {lease.document_url && (
            <Button variant="link" className="p-0 h-auto" asChild>
              <a href={lease.document_url} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 h-4 w-4" /> View Full Agreement
              </a>
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No active lease found for this unit.</p>
      )}

      {/* Create Lease Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Lease</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tenant_id">Tenant ID</Label>
              <Input
                id="tenant_id"
                name="tenant_id"
                value={formData.tenant_id}
                onChange={handleInputChange}
                placeholder="Enter tenant ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <DatePicker
                  date={formData.start_date}
                  onSelect={(date) => handleDateChange(date, 'start_date')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <DatePicker
                  date={formData.end_date}
                  onSelect={(date) => handleDateChange(date, 'end_date')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rent_amount">Rent Amount</Label>
                <Input
                  id="rent_amount"
                  name="rent_amount"
                  type="number"
                  value={formData.rent_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deposit_amount">Deposit Amount</Label>
                <Input
                  id="deposit_amount"
                  name="deposit_amount"
                  type="number"
                  value={formData.deposit_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Lease'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lease Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lease</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <DatePicker
                  date={formData.start_date}
                  onSelect={(date) => handleDateChange(date, 'start_date')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date</Label>
                <DatePicker
                  date={formData.end_date}
                  onSelect={(date) => handleDateChange(date, 'end_date')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rent_amount">Rent Amount</Label>
                <Input
                  id="rent_amount"
                  name="rent_amount"
                  type="number"
                  value={formData.rent_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deposit_amount">Deposit Amount</Label>
                <Input
                  id="deposit_amount"
                  name="deposit_amount"
                  type="number"
                  value={formData.deposit_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Lease'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}