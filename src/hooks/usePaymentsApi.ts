import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { Payment } from '../api/types';

export function usePaymentsApi(filters?: {
  property_id?: string;
  tenant_id?: string;
  status?: string;
  payment_type?: string;
  start_date?: string;
  end_date?: string;
}) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const paymentsData = await api.payment.getPayments(filters);
      setPayments(paymentsData);
    } catch (error: unknown) {
      console.error('Error fetching payments:', error);
      let errorMessage = 'Failed to fetch payments';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Create a new payment
  const addPayment = async (paymentData: {
    amount: number;
    due_date: string;
    payment_type: 'rent' | 'deposit' | 'maintenance' | 'other';
    description?: string;
    property_id: string;
    tenant_id: string;
  }) => {
    try {
      const createdPayment = await api.payment.createPayment(paymentData);
      setPayments(prev => [...prev, createdPayment]);
      return { success: true, payment: createdPayment };
    } catch (error: unknown) {
      console.error('Error creating payment:', error);
      let errorMessage = 'Failed to create payment';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Update a payment
  const updatePayment = async (id: string, paymentData: Partial<Payment>) => {
    try {
      const updatedPayment = await api.payment.updatePayment(id, paymentData);
      setPayments(prev => prev.map(p => p.id === id ? updatedPayment : p));
      return { success: true, payment: updatedPayment };
    } catch (error: unknown) {
      console.error('Error updating payment:', error);
      let errorMessage = 'Failed to update payment';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Delete a payment
  const deletePayment = async (id: string) => {
    try {
      const success = await api.payment.deletePayment(id);
      if (success) {
        setPayments(prev => prev.filter(p => p.id !== id));
      }
      return { success };
    } catch (error: unknown) {
      console.error('Error deleting payment:', error);
      let errorMessage = 'Failed to delete payment';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  // Record a payment
  const recordPayment = async (paymentId: string, data: {
    amount: number;
    payment_method: string;
    receipt_url?: string;
  }) => {
    try {
      const updatedPayment = await api.payment.recordPayment(paymentId, data);
      setPayments(prev => prev.map(p => p.id === paymentId ? updatedPayment : p));
      return { success: true, payment: updatedPayment };
    } catch (error: unknown) {
      console.error('Error recording payment:', error);
      let errorMessage = 'Failed to record payment';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, JSON.stringify(filters)]);

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
    addPayment,
    updatePayment,
    deletePayment,
    recordPayment
  };
} 