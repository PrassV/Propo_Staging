import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';

interface RecordPaymentModalProps {
  propertyId: string;
  onClose: () => void;
  onSubmit: () => void;
}

export default function RecordPaymentModal({ propertyId, onClose, onSubmit }: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<Array<{id: string; unit_number: string; tenant_id: string; tenant: { id: string; name: string }}>>([]); 
  const [formData, setFormData] = useState({
    paymentType: 'rent',
    propertyTenantId: '',
    unitNumber: '',
    amount: '',
    maintenanceAmount: '0',
    dueDate: '',
    period: '',
    taxType: 'property',
    meterNumber: '',
    readingStart: '',
    readingEnd: ''
  });

  useEffect(() => {
    fetchUnits();
  }, [propertyId]);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('property_tenants')
        .select(`
          id,
          unit_number,
          tenant_id,
          tenant:tenants(
            id,
            name
          )
        `)
        .eq('property_id', propertyId);

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to fetch units');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.propertyTenantId) {
      toast.error('Please select a unit');
      return;
    }

    setLoading(true);
    try {
      const unit = units.find(u => u.id === formData.propertyTenantId);
      if (!unit) throw new Error('Unit not found');

      switch (formData.paymentType) {
        case 'electricity': {
          const unitsConsumed = parseFloat(formData.readingEnd) - parseFloat(formData.readingStart);
          const { error: electricityError } = await supabase
            .from('electricity_payments')
            .insert({
              property_tenant_id: formData.propertyTenantId,
              meter_number: formData.meterNumber,
              reading_start: parseFloat(formData.readingStart),
              reading_end: parseFloat(formData.readingEnd),
              units_consumed: unitsConsumed,
              amount: parseFloat(formData.amount),
              bill_period: formData.period,
              due_date: formData.dueDate,
              status: 'pending'
            });

          if (electricityError) throw electricityError;
          break;
        }

        case 'tax': {
          const { error: taxError } = await supabase
            .from('tax_payments')
            .insert({
              property_id: propertyId,
              type: formData.taxType,
              amount: parseFloat(formData.amount),
              period: formData.period,
              due_date: formData.dueDate,
              status: 'pending'
            });

          if (taxError) throw taxError;
          break;
        }

        case 'rent': {
          const [startDate, endDate] = formData.period.split(' - ');
          const { error: rentError } = await supabase
            .from('payment_history')
            .insert({
              tenant_id: unit.tenant.id,
              period_start: startDate,
              period_end: endDate,
              rent_amount: parseFloat(formData.amount),
              maintenance_amount: parseFloat(formData.maintenanceAmount),
              payment_status: 'pending',
              due_date: formData.dueDate
            });

          if (rentError) throw rentError;
          break;
        }
      }

      toast.success('Payment recorded successfully');
      onSubmit();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Record Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
            <select
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
            >
              <option value="rent">Rent</option>
              <option value="electricity">Electricity</option>
              <option value="tax">Tax</option>
            </select>
          </div>

          {/* Unit Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={formData.propertyTenantId}
              onChange={(e) => {
                const unit = units.find(u => u.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  propertyTenantId: e.target.value,
                  unitNumber: unit?.unit_number || ''
                });
              }}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
            >
              <option value="">Select Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  Unit {unit.unit_number} - {unit.tenant?.name}
                </option>
              ))}
            </select>
          </div>

          {formData.paymentType === 'tax' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Type</label>
              <select
                value={formData.taxType}
                onChange={(e) => setFormData({ ...formData, taxType: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
                required
              >
                <option value="property">Property Tax</option>
                <option value="water">Water Tax</option>
                <option value="other">Other Tax</option>
              </select>
            </div>
          )}

          {formData.paymentType === 'electricity' && (
            <>
              <InputField
                label="Meter Number"
                type="text"
                value={formData.meterNumber}
                onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Start Reading"
                  type="number"
                  value={formData.readingStart}
                  onChange={(e) => setFormData({ ...formData, readingStart: e.target.value })}
                  required
                />
                <InputField
                  label="End Reading"
                  type="number"
                  value={formData.readingEnd}
                  onChange={(e) => setFormData({ ...formData, readingEnd: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          <InputField
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />

          {formData.paymentType === 'rent' && (
            <InputField
              label="Maintenance Amount"
              type="number"
              value={formData.maintenanceAmount}
              onChange={(e) => setFormData({ ...formData, maintenanceAmount: e.target.value })}
              required
            />
          )}

          <InputField
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />

          <InputField
            label="Period"
            type="text"
            value={formData.period}
            onChange={(e) => setFormData({ ...formData, period: e.target.value })}
            placeholder={
              formData.paymentType === 'electricity' ? 'e.g., Jan 2024' : 
              formData.paymentType === 'tax' ? 'e.g., 2024-Q1' :
              'e.g., Jan 8, 2024 - Feb 8, 2024'
            }
            required
          />

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}