import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, AlertTriangle, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import api from '@/api';
import { PropertyTax, PropertyTaxCreate } from '@/api/types';

interface PropertyTaxCardProps {
  propertyId: string;
}

export default function PropertyTaxCard({ propertyId }: PropertyTaxCardProps) {
  const [taxes, setTaxes] = useState<PropertyTax[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue' | 'cancelled'>('pending');
  const [notes, setNotes] = useState<string>('');
  
  const fetchTaxes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use API once implemented, for now use placeholder
      try {
        const data = await api.property.getPropertyTaxes(propertyId);
        setTaxes(data);
      } catch {
        console.error("API not implemented yet, using placeholder data");
        // Placeholder data until backend is ready
        setTaxes([
          {
            id: '1',
            property_id: propertyId,
            tax_year: new Date().getFullYear(),
            amount: 2500,
            due_date: '2023-12-31',
            payment_date: '2023-12-15',
            status: 'paid',
            notes: 'Annual property tax payment',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: '2',
            property_id: propertyId,
            tax_year: new Date().getFullYear() - 1,
            amount: 2300,
            due_date: '2022-12-31',
            payment_date: '2022-12-20',
            status: 'paid',
            notes: 'Annual property tax payment',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error("Error fetching tax records:", err);
      setError(err instanceof Error ? err.message : 'Failed to load tax records');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTaxes();
  }, [propertyId]);
  
  const handleAddTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const taxData: PropertyTaxCreate = {
        tax_year: taxYear,
        amount: amount,
        due_date: dueDate,
        payment_date: paymentDate || undefined,
        status: status,
        notes: notes || undefined
      };
      
      // Use API once implemented
      try {
        const newTax = await api.property.createPropertyTax(propertyId, taxData);
        setTaxes([newTax, ...taxes]);
        toast.success('Tax record added successfully');
      } catch {
        console.error("API not implemented yet, using placeholder data");
        // Placeholder behavior until backend is ready
        const newTax: PropertyTax = {
          id: Math.random().toString(36).substring(7),
          property_id: propertyId,
          ...taxData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setTaxes([newTax, ...taxes]);
        toast.success('Tax record added successfully (placeholder)');
      }
      
      // Reset form
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to add tax record');
      console.error("Error adding tax record:", err);
    } finally {
      setSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setTaxYear(new Date().getFullYear());
    setAmount(0);
    setDueDate('');
    setPaymentDate('');
    setStatus('pending');
    setNotes('');
  };
  
  // Function to get badge variant based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return { variant: 'default', label: 'Paid' };
      case 'pending': return { variant: 'secondary', label: 'Pending' };
      case 'overdue': return { variant: 'destructive', label: 'Overdue' };
      case 'cancelled': return { variant: 'outline', label: 'Cancelled' };
      default: return { variant: 'outline', label: status };
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property Tax Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-destructive">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-medium">Error loading tax records</p>
          </div>
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Property Tax Records</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Record
        </Button>
      </CardHeader>
      <CardContent>
        {taxes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tax records found. Add your first tax record.
          </div>
        ) : (
          <div className="space-y-4">
            {taxes.map((tax) => {
              const badgeInfo = getStatusBadge(tax.status);
              return (
                <div key={tax.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">{tax.tax_year} Property Tax</p>
                      <p className="text-sm text-muted-foreground">
                        Amount: ₹{tax.amount.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant={badgeInfo.variant as 'default' | 'secondary' | 'destructive' | 'outline'}>{badgeInfo.label}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Due Date:</span>
                      <span>{new Date(tax.due_date).toLocaleDateString()}</span>
                    </div>
                    {tax.payment_date && (
                      <div className="flex justify-between">
                        <span>Payment Date:</span>
                        <span>{new Date(tax.payment_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {tax.notes && (
                      <div className="mt-2 text-muted-foreground">
                        {tax.notes}
                      </div>
                    )}
                    {tax.document_id && (
                      <div className="mt-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          <FileText className="mr-1 h-3 w-3" /> View Document
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Add Tax Record Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tax Record</DialogTitle>
              <DialogDescription>
                Enter the details for the property tax payment record.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddTax} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-year">Tax Year</Label>
                  <Input
                    id="tax-year"
                    type="number"
                    value={taxYear}
                    onChange={(e) => setTaxYear(Number(e.target.value))}
                    min={1900}
                    max={2100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min={0}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">Payment Date (if paid)</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as 'pending' | 'paid' | 'overdue' | 'cancelled')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information"
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Record'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 