import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import InputField from '../auth/InputField';
import { Tenant } from '../../types/tenant';
import RentalDetailsForm from './RentalDetailsForm';
import UtilityDetailsForm from './UtilityDetailsForm';
import toast from 'react-hot-toast';

interface EditTenantFormProps {
  tenant: Tenant;
  onSave: () => void;
  onCancel: () => void;
}

export default function EditTenantForm({ tenant, onSave, onCancel }: EditTenantFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant.name,
    phone: tenant.phone,
    email: tenant.email,
    familySize: tenant.familySize,
    permanentAddress: tenant.permanentAddress,
    rental_details: {
      rental_type: tenant.rental_type as 'rent' | 'lease',
      rental_frequency: tenant.rental_frequency,
      rental_amount: tenant.rental_amount,
      maintenance_fee: tenant.maintenance_fee,
      advance_amount: tenant.advance_amount,
      rental_start_date: tenant.rental_start_date,
      rental_end_date: tenant.rental_end_date,
      lease_amount: tenant.lease_amount,
      lease_start_date: tenant.lease_start_date,
      lease_end_date: tenant.lease_end_date
    },
    utility_details: {
      maintenanceCharges: tenant.maintenance_fee?.toString() || '',
      electricityBills: tenant.utility_details?.electricity_responsibility || 'tenant',
      waterCharges: tenant.utility_details?.water_responsibility || 'tenant',
      noticePeriod: tenant.utility_details?.notice_period_days?.toString() || '30'
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          family_size: formData.familySize,
          permanent_address: formData.permanentAddress,
          rental_type: formData.rental_details.rental_type,
          rental_frequency: formData.rental_details.rental_frequency,
          rental_amount: formData.rental_details.rental_amount,
          maintenance_fee: parseFloat(formData.utility_details.maintenanceCharges),
          advance_amount: formData.rental_details.advance_amount,
          rental_start_date: formData.rental_details.rental_start_date,
          rental_end_date: formData.rental_details.rental_end_date,
          lease_amount: formData.rental_details.lease_amount,
          lease_start_date: formData.rental_details.lease_start_date,
          lease_end_date: formData.rental_details.lease_end_date,
          utility_details: {
            electricity_responsibility: formData.utility_details.electricityBills,
            water_responsibility: formData.utility_details.waterCharges,
            notice_period_days: parseInt(formData.utility_details.noticePeriod)
          }
        })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success('Tenant details updated successfully');
      onSave();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast.error(error.message || 'Failed to update tenant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-wide">Edit Tenant Details</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          disabled={loading}
        >
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Tenant Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={loading}
          />
          <InputField
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <InputField
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={loading}
        />

        <InputField
          label="Family Size"
          type="number"
          min="1"
          value={formData.familySize}
          onChange={(e) => setFormData({ ...formData, familySize: e.target.value })}
          required
          disabled={loading}
        />

        <InputField
          label="Permanent Address"
          type="text"
          value={formData.permanentAddress}
          onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
          required
          disabled={loading}
        />

        <RentalDetailsForm
          value={formData.rental_details}
          onChange={(details) => setFormData({ ...formData, rental_details: details })}
          disabled={loading}
        />

        <UtilityDetailsForm
          value={formData.utility_details}
          onChange={(details) => setFormData({ ...formData, utility_details: details })}
          disabled={loading}
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Saving Changes...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}