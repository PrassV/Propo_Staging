import React, { useState, useEffect } from 'react';
import { RecentPayment } from '@/api/types';
import { getPaymentsByUnitId, createPaymentRequest, recordManualPayment, updatePayment } from '@/api/services/paymentService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

interface PaymentListTabProps {
  unitId: string;
  tenantId?: string | null; // Optional tenant ID for filtering
  propertyId: string;
}

export default function PaymentListTab({ unitId, tenantId, propertyId }: PaymentListTabProps) {
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<RecentPayment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [createFormData, setCreateFormData] = useState({
    amount: '',
    due_date: new Date(),
    payment_type: 'rent',
    description: ''
  });

  const [recordFormData, setRecordFormData] = useState({
    amount_paid: '',
    payment_date: new Date(),
    payment_method: 'cash',
    notes: ''
  });

  const [editFormData, setEditFormData] = useState({
    amount: '',
    due_date: new Date(),
    payment_type: 'rent',
    description: '',
    status: 'pending'
  });

  useEffect(() => {
    const fetchPayments = async () => {
      if (!unitId) return;
      setLoading(true); setError(null);
      try {
        // Use actual API call
        const params: { tenantId?: string } = {};
        if (tenantId) {
            params.tenantId = tenantId;
        }
        // Use imported service function
        const data = await getPaymentsByUnitId(unitId, params);
        setPayments(data || []); // API service returns RecentPayment[]
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError(err instanceof Error ? err.message : 'Failed to load payments.');
        setPayments([]); // Clear on error
        // Set a fallback message for missing API
        if (err instanceof Error && (err.message.includes('404') || err.message.includes('endpoint'))) {
          setError('Payment functionality is not yet implemented. This feature is coming soon.');
        }
      } finally { setLoading(false); }
    };
    fetchPayments();
  }, [unitId, tenantId]);

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    status = status.toLowerCase();
    if (status.includes('completed') || status.includes('paid')) return 'default'; // Use default (primary) for success
    if (status.includes('pending') || status.includes('processing')) return 'secondary'; // Keep secondary for pending
    if (status.includes('failed') || status.includes('overdue')) return 'destructive';
    return 'secondary';
  };

  const handleEditPayment = (payment: RecentPayment) => {
    setSelectedPayment(payment);
    setEditFormData({
      amount: payment.amount.toString(),
      due_date: new Date(payment.due_date),
      payment_type: payment.payment_type,
      description: payment.description || '',
      status: payment.status
    });
    setEditDialogOpen(true);
  };

  const handleCreatePayment = () => {
    setCreateDialogOpen(true);
  };

  const handleRecordPayment = (payment: RecentPayment) => {
    setSelectedPayment(payment);
    setRecordFormData({
      amount_paid: payment.amount.toString(),
      payment_date: new Date(),
      payment_method: 'cash',
      notes: ''
    });
    setRecordDialogOpen(true);
  };

  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRecordInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRecordFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string, formType: 'create' | 'record' | 'edit') => {
    if (formType === 'create') {
      setCreateFormData(prev => ({ ...prev, [name]: value }));
    } else if (formType === 'record') {
      setRecordFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (date: Date | undefined, name: string, formType: 'create' | 'record' | 'edit') => {
    if (!date) return;

    if (formType === 'create') {
      setCreateFormData(prev => ({ ...prev, [name]: date }));
    } else if (formType === 'record') {
      setRecordFormData(prev => ({ ...prev, [name]: date }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: date }));
    }
  };

  const handleCreateSubmit = async () => {
    if (!createFormData.amount || !createFormData.due_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: "Error",
        description: "No tenant assigned to this unit",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await createPaymentRequest({
        amount: parseFloat(createFormData.amount),
        due_date: createFormData.due_date.toISOString().split('T')[0],
        payment_type: createFormData.payment_type,
        description: createFormData.description,
        property_id: propertyId,
        tenant_id: tenantId,
        unit_id: unitId,
        lease_id: tenantId,
      });

      toast({
        title: "Success",
        description: "Payment request created successfully"
      });

      // Reset form and close dialog
      setCreateFormData({
        amount: '',
        due_date: new Date(),
        payment_type: 'rent',
        description: ''
      });
      setCreateDialogOpen(false);

      // Refresh the list
      const params: { tenantId?: string } = {};
      if (tenantId) {
        params.tenantId = tenantId;
      }
      const data = await getPaymentsByUnitId(unitId, params);
      setPayments(data || []);
    } catch (err) {
      console.error("Error creating payment request:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create payment request',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedPayment || !editFormData.amount || !editFormData.due_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await updatePayment(selectedPayment.id, {
        amount: parseFloat(editFormData.amount),
        due_date: editFormData.due_date.toISOString().split('T')[0],
        description: editFormData.description,
        status: editFormData.status as 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled'
      });

      toast({
        title: "Success",
        description: "Payment updated successfully"
      });

      setEditDialogOpen(false);
      setSelectedPayment(null);

      const params: { tenantId?: string } = {};
      if (tenantId) {
        params.tenantId = tenantId;
      }
      const data = await getPaymentsByUnitId(unitId, params);
      setPayments(data || []);
    } catch (err) {
      console.error("Error updating payment:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to update payment',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordSubmit = async () => {
    if (!selectedPayment || !recordFormData.amount_paid || !recordFormData.payment_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await recordManualPayment(selectedPayment.id, {
        amount_paid: parseFloat(recordFormData.amount_paid),
        payment_date: recordFormData.payment_date.toISOString().split('T')[0],
        payment_method: recordFormData.payment_method,
        notes: recordFormData.notes
      });

      toast({
        title: "Success",
        description: "Payment recorded successfully"
      });

      // Reset form and close dialog
      setRecordFormData({
        amount_paid: '',
        payment_date: new Date(),
        payment_method: 'cash',
        notes: ''
      });
      setRecordDialogOpen(false);
      setSelectedPayment(null);

      // Refresh the list
      const params: { tenantId?: string } = {};
      if (tenantId) {
        params.tenantId = tenantId;
      }
      const data = await getPaymentsByUnitId(unitId, params);
      setPayments(data || []);
    } catch (err) {
      console.error("Error recording payment:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to record payment',
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Management</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              💡 This feature will allow you to:
            </p>
            <ul className="text-blue-700 text-sm mt-2 space-y-1">
              <li>• Track rent payments and due dates</li>
              <li>• Generate payment requests</li>
              <li>• Record manual payments</li>
              <li>• View payment history</li>
            </ul>
          </div>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Payments</h3>
        {tenantId && (
          <Button size="sm" onClick={handleCreatePayment}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Payment
          </Button>
        )}
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments found for this unit.</p>
      ) : (
        <div className="space-y-3">
          {payments.map(pay => (
            <Card key={pay.id} className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-lg">₹{pay.amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">Due: {new Date(pay.due_date).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={getStatusVariant(pay.status)} className="text-xs">{pay.status}</Badge>
                  <div className="mt-2 flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditPayment(pay)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRecordPayment(pay)}>
                      <Receipt className="mr-2 h-4 w-4" /> Record
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Payment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payment Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={createFormData.amount}
                onChange={handleCreateInputChange}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_date">Due Date</Label>
              <DatePicker
                date={createFormData.due_date}
                onSelect={(date) => handleDateChange(date, 'due_date', 'create')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_type">Payment Type</Label>
              <Select name="payment_type" value={createFormData.payment_type} onValueChange={(value) => handleSelectChange('payment_type', value, 'create')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="security_deposit">Security Deposit</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="late_fee">Late Fee</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={createFormData.description}
                onChange={handleCreateInputChange}
                placeholder="Payment description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_amount">Amount</Label>
              <Input id="edit_amount" name="amount" value={editFormData.amount} onChange={handleRecordInputChange} type="number" />
            </div>
            <div>
              <Label htmlFor="edit_due_date">Due Date</Label>
              <DatePicker date={editFormData.due_date} onSelect={(date: Date | undefined) => handleDateChange(date, 'due_date', 'edit')} />
            </div>
            <div>
              <Label htmlFor="edit_payment_type">Payment Type</Label>
              <Select name="payment_type" value={editFormData.payment_type} onValueChange={(value) => handleSelectChange('payment_type', value, 'edit')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="security_deposit">Security Deposit</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="late_fee">Late Fee</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_status">Status</Label>
              <Select name="status" value={editFormData.status} onValueChange={(value) => handleSelectChange('status', value, 'edit')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea id="edit_description" name="description" value={editFormData.description} onChange={handleRecordInputChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? <LoadingSpinner /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment for Invoice #{selectedPayment?.id.substring(0, 8)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount_paid">Amount Paid</Label>
              <Input id="amount_paid" name="amount_paid" value={recordFormData.amount_paid} onChange={handleRecordInputChange} type="number" />
            </div>
            <div>
              <Label htmlFor="payment_date">Payment Date</Label>
              <DatePicker date={recordFormData.payment_date} onSelect={(date: Date | undefined) => handleDateChange(date, 'payment_date', 'record')} />
            </div>
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select name="payment_method" value={recordFormData.payment_method} onValueChange={(value) => handleSelectChange('payment_method', value, 'record')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="online_platform">Online Platform</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" name="notes" value={recordFormData.notes} onChange={handleRecordInputChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordSubmit} disabled={submitting}>
              {submitting ? <LoadingSpinner /> : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}