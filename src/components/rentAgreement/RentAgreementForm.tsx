import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import InputField from '../auth/InputField';

interface RentAgreementFormProps {
  onSubmit: (data: any) => void;
  loading?: boolean;
  initialData?: Partial<typeof defaultFormData>;
}

const defaultFormData = {
  // Landlord Details
  landlordName: '',
  landlordAddress: '',
  landlordPhone: '',

  // Tenant Details
  tenantName: '',
  tenantAddress: '',
  tenantPhone: '',
  tenantEmail: '',
  tenantAadhaar: '',

  // Property Details
  propertyAddress: '',
  propertyType: 'residential',
  monthlyRent: '',
  securityDeposit: '',
  leaseDuration: '11',
  startDate: '',
  
  // Additional Terms
  maintenanceCharges: '',
  electricityBills: 'tenant',
  waterCharges: 'tenant',
  noticePeriod: '1',
  
  // Witness Details
  witness1Name: '',
  witness1Address: '',
  witness2Name: '',
  witness2Address: ''
};

export default function RentAgreementForm({ onSubmit, loading, initialData = {} }: RentAgreementFormProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [formData, setFormData] = useState({
    ...defaultFormData,
    landlordName: profile?.first_name + ' ' + profile?.last_name || '',
    landlordAddress: profile?.address_line1 || '',
    landlordPhone: profile?.phone || '',
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Landlord Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Landlord Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Landlord Name"
            type="text"
            value={formData.landlordName}
            onChange={(e) => setFormData({ ...formData, landlordName: e.target.value })}
            required
            disabled={loading}
          />
          <InputField
            label="Phone Number"
            type="tel"
            value={formData.landlordPhone}
            onChange={(e) => setFormData({ ...formData, landlordPhone: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        <InputField
          label="Address"
          type="text"
          value={formData.landlordAddress}
          onChange={(e) => setFormData({ ...formData, landlordAddress: e.target.value })}
          required
          disabled={loading}
        />
      </div>

      {/* Tenant Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tenant Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Tenant Name"
            type="text"
            value={formData.tenantName}
            onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
            required
            disabled={loading}
          />
          <InputField
            label="Phone Number"
            type="tel"
            value={formData.tenantPhone}
            onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        <InputField
          label="Email"
          type="email"
          value={formData.tenantEmail}
          onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
          required
          disabled={loading}
        />
        <InputField
          label="Address"
          type="text"
          value={formData.tenantAddress}
          onChange={(e) => setFormData({ ...formData, tenantAddress: e.target.value })}
          required
          disabled={loading}
        />
        <InputField
          label="Aadhaar Number"
          type="text"
          value={formData.tenantAadhaar}
          onChange={(e) => setFormData({ ...formData, tenantAadhaar: e.target.value })}
          required
          disabled={loading}
        />
      </div>

      {/* Property Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Property Details</h3>
        <InputField
          label="Property Address"
          type="text"
          value={formData.propertyAddress}
          onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
          required
          disabled={loading}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <select
              value={formData.propertyType}
              onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={loading}
            >
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>
          <InputField
            label="Monthly Rent"
            type="number"
            value={formData.monthlyRent}
            onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Security Deposit"
            type="number"
            value={formData.securityDeposit}
            onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
            required
            disabled={loading}
          />
          <InputField
            label="Lease Duration (months)"
            type="number"
            value={formData.leaseDuration}
            onChange={(e) => setFormData({ ...formData, leaseDuration: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        <InputField
          label="Start Date"
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
          disabled={loading}
        />
      </div>

      {/* Additional Terms */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Additional Terms</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Maintenance Charges"
            type="number"
            value={formData.maintenanceCharges}
            onChange={(e) => setFormData({ ...formData, maintenanceCharges: e.target.value })}
            required
            disabled={loading}
          />
          <InputField
            label="Notice Period (months)"
            type="number"
            value={formData.noticePeriod}
            onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
            required
            disabled={loading}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Electricity Bills</label>
            <select
              value={formData.electricityBills}
              onChange={(e) => setFormData({ ...formData, electricityBills: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={loading}
            >
              <option value="tenant">Paid by Tenant</option>
              <option value="landlord">Paid by Landlord</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Water Charges</label>
            <select
              value={formData.waterCharges}
              onChange={(e) => setFormData({ ...formData, waterCharges: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={loading}
            >
              <option value="tenant">Paid by Tenant</option>
              <option value="landlord">Paid by Landlord</option>
            </select>
          </div>
        </div>
      </div>

      {/* Witness Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Witness Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Witness 1</h4>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Name"
                type="text"
                value={formData.witness1Name}
                onChange={(e) => setFormData({ ...formData, witness1Name: e.target.value })}
                required
                disabled={loading}
              />
              <InputField
                label="Address"
                type="text"
                value={formData.witness1Address}
                onChange={(e) => setFormData({ ...formData, witness1Address: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Witness 2</h4>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Name"
                type="text"
                value={formData.witness2Name}
                onChange={(e) => setFormData({ ...formData, witness2Name: e.target.value })}
                required
                disabled={loading}
              />
              <InputField
                label="Address"
                type="text"
                value={formData.witness2Address}
                onChange={(e) => setFormData({ ...formData, witness2Address: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg font-semibold tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {loading ? 'Generating Agreement...' : 'Generate Agreement'}
      </button>
    </form>
  );
}