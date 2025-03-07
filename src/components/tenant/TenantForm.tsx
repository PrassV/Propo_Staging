import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';

interface TenantFormProps {
  propertyId: string;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const TenantForm = ({ propertyId, onSubmit, onCancel, loading = false }: TenantFormProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male',
    familySize: '',
    permanentAddress: '',
    idType: 'pan_card',
    idNumber: '',
    idProof: null as File | null,
    unitNumber: '',
    rentalType: 'rent',
    rentalFrequency: 'monthly',
    rentalAmount: '',
    maintenanceCharges: '',
    advanceAmount: '',
    startDate: '',
    endDate: '',
    electricityBills: 'tenant',
    waterCharges: 'tenant',
    noticePeriod: '30'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitNumber) {
      toast.error('Unit number is required');
      return;
    }

    setSubmitting(true);

    try {
      let idProofUrl = '';
      if (formData.idProof) {
        const fileExt = formData.idProof.name.split('.').pop();
        const filePath = `${propertyId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('tenant-documents')
          .upload(filePath, formData.idProof);

        if (uploadError) throw uploadError;
        idProofUrl = filePath;
      }

      // Create tenant record
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          dob: formData.dob,
          gender: formData.gender,
          family_size: parseInt(formData.familySize),
          permanent_address: formData.permanentAddress,
          id_type: formData.idType,
          id_number: formData.idNumber,
          id_proof_url: idProofUrl,
          rental_type: formData.rentalType,
          rental_frequency: formData.rentalFrequency,
          rental_amount: parseFloat(formData.rentalAmount),
          maintenance_fee: parseFloat(formData.maintenanceCharges),
          advance_amount: parseFloat(formData.advanceAmount),
          rental_start_date: formData.startDate,
          rental_end_date: formData.endDate,
          utility_details: {
            electricity_responsibility: formData.electricityBills,
            water_responsibility: formData.waterCharges,
            notice_period_days: parseInt(formData.noticePeriod)
          }
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Link tenant to property with unit number
      const { error: linkError } = await supabase
        .from('property_tenants')
        .insert({
          property_id: propertyId,
          tenant_id: tenant.id,
          unit_number: formData.unitNumber,
          start_date: formData.startDate
        });

      if (linkError) throw linkError;

      toast.success('Tenant added successfully!');
      onSubmit();
    } catch (error: any) {
      console.error('Error adding tenant:', error);
      toast.error(error.message || 'Failed to add tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = loading || submitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-wide">Add New Tenant</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          disabled={isDisabled}
        >
          <X size={24} />
        </button>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Tenant Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={isDisabled}
        />
        <InputField
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
          disabled={isDisabled}
        />
      </div>

      <InputField
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
        disabled={isDisabled}
      />

      {/* Unit Number */}
      <InputField
        label="Unit Number"
        type="text"
        value={formData.unitNumber}
        onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
        required
        disabled={isDisabled}
        placeholder="Enter unit number"
      />

      {/* Personal details */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Date of Birth"
          type="date"
          value={formData.dob}
          onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
          required
          disabled={isDisabled}
        />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
            disabled={isDisabled}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Additional details */}
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Family Size"
          type="number"
          min="1"
          value={formData.familySize}
          onChange={(e) => setFormData({ ...formData, familySize: e.target.value })}
          required
          disabled={isDisabled}
        />
      </div>

      <InputField
        label="Permanent Address"
        type="text"
        value={formData.permanentAddress}
        onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
        required
        disabled={isDisabled}
      />

      {/* ID details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">ID Type</label>
          <select
            value={formData.idType}
            onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
            disabled={isDisabled}
          >
            <option value="pan_card">PAN Card</option>
            <option value="aadhaar">Aadhaar</option>
            <option value="passport">Passport</option>
            <option value="ration_card">Ration Card</option>
          </select>
        </div>
        <InputField
          label="ID Number"
          type="text"
          value={formData.idNumber}
          onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
          required
          disabled={isDisabled}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Upload ID Proof</label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFormData({ ...formData, idProof: e.target.files?.[0] || null })}
          className="w-full p-2 border rounded-lg"
          required
          disabled={isDisabled}
        />
      </div>

      {/* Rental Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Rental Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Rental Type</label>
            <select
              value={formData.rentalType}
              onChange={(e) => setFormData({ ...formData, rentalType: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={isDisabled}
            >
              <option value="rent">Rent</option>
              <option value="lease">Lease</option>
            </select>
          </div>
          
          {formData.rentalType === 'rent' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Frequency</label>
              <select
                value={formData.rentalFrequency}
                onChange={(e) => setFormData({ ...formData, rentalFrequency: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
                required
                disabled={isDisabled}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Rental Amount"
            type="number"
            value={formData.rentalAmount}
            onChange={(e) => setFormData({ ...formData, rentalAmount: e.target.value })}
            required
            disabled={isDisabled}
          />
          <InputField
            label="Maintenance Charges"
            type="number"
            value={formData.maintenanceCharges}
            onChange={(e) => setFormData({ ...formData, maintenanceCharges: e.target.value })}
            required
            disabled={isDisabled}
          />
        </div>

        <InputField
          label="Advance Amount"
          type="number"
          value={formData.advanceAmount}
          onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
          required
          disabled={isDisabled}
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
            disabled={isDisabled}
          />
          <InputField
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
            disabled={isDisabled}
          />
        </div>
      </div>

      {/* Utility Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Utility Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Electricity Bills</label>
            <select
              value={formData.electricityBills}
              onChange={(e) => setFormData({ ...formData, electricityBills: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={isDisabled}
            >
              <option value="tenant">Paid by Tenant</option>
              <option value="landlord">Paid by Landlord</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Water Charges</label>
            <select
              value={formData.waterCharges}
              onChange={(e) => setFormData({ ...formData, waterCharges: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={isDisabled}
            >
              <option value="tenant">Paid by Tenant</option>
              <option value="landlord">Paid by Landlord</option>
            </select>
          </div>
        </div>

        <InputField
          label="Notice Period (in days)"
          type="number"
          min="1"
          value={formData.noticePeriod}
          onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
          required
          disabled={isDisabled}
        />
      </div>

      {/* Form actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          disabled={isDisabled}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          disabled={isDisabled}
        >
          {submitting ? 'Adding Tenant...' : 'Add Tenant'}
        </button>
      </div>
    </form>
  );
};

export default TenantForm;