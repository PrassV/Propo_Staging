import React, { useState, useEffect } from 'react';
import { RecentPayment } from '@/api/types';
import { getPaymentsByUnitId, createPaymentRequest, recordManualPayment } from '@/api/services/paymentService';
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
}

export default function PaymentListTab({ unitId, tenantId }: PaymentListTabProps) {
  const [payments, setPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
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

  const handleSelectChange = (name: string, value: string, formType: 'create' | 'record') => {
    if (formType === 'create') {
      setCreateFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setRecordFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (date: Date | undefined, name: string, formType: 'create' | 'record') => {
    if (!date) return;

    if (formType === 'create') {
      setCreateFormData(prev => ({ ...prev, [name]: date }));
    } else {
      setRecordFormData(prev => ({ ...prev, [name]: date }));
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
        property_id: '', // Will be filled by backend based on unit
        tenant_id: tenantId,
        unit_number: unitId
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
                  <p className="font-medium">${pay.amount.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {pay.payment_date ?
                      `Paid: ${new Date(pay.payment_date).toLocaleDateString()}` :
                      `Due: ${new Date(pay.due_date).toLocaleDateString()}`
                    }
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={getStatusVariant(pay.status)} className="text-xs">{pay.status}</Badge>
                  {(pay.status === 'pending' || pay.status === 'partially_paid') && (
                    <Button size="sm" variant="outline" onClick={() => handleRecordPayment(pay)}>
                      <Receipt className="mr-2 h-3 w-3" /> Record
                    </Button>
                  )}
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
              <Select
                value={createFormData.payment_type}
                onValueChange={(value) => handleSelectChange('payment_type', value, 'create')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="deposit">Security Deposit</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
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

      {/* Record Payment Dialog */}
      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedPayment && (
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">Payment Details</p>
                <p className="text-sm">Amount Due: ${selectedPayment.amount.toFixed(2)}</p>
                <p className="text-sm">Status: {selectedPayment.status}</p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="amount_paid">Amount Paid</Label>
              <Input
                id="amount_paid"
                name="amount_paid"
                type="number"
                value={recordFormData.amount_paid}
                onChange={handleRecordInputChange}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <DatePicker
                date={recordFormData.payment_date}
                onSelect={(date) => handleDateChange(date, 'payment_date', 'record')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={recordFormData.payment_method}
                onValueChange={(value) => handleSelectChange('payment_method', value, 'record')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={recordFormData.notes}
                onChange={handleRecordInputChange}
                placeholder="Payment notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordSubmit} disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}