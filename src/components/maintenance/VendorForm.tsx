import { useState } from 'react';
import { X } from 'lucide-react';
import InputField from '../auth/InputField';
import { Vendor, MaintenanceCategory } from '../../types/maintenance';
import { createVendor } from '../../services/vendorService';
import toast from 'react-hot-toast';

interface VendorFormProps {
  onClose: () => void;
  onSubmit: () => void;
}

export default function VendorForm({ onClose, onSubmit }: VendorFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categories: [] as MaintenanceCategory[],
    phone: '',
    email: '',
    address: '',
    license_number: '',
    insurance_info: '',
    hourly_rate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createVendor({
        ...formData,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Vendor added successfully');
      onSubmit();
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      toast.error(error.message || 'Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add New Vendor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <InputField
            label="Vendor Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categories
            </label>
            <select
              multiple
              value={formData.categories}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value as MaintenanceCategory);
                setFormData({ ...formData, categories: selected });
              }}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={loading}
            >
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="carpentry">Carpentry</option>
              <option value="painting">Painting</option>
              <option value="appliance">Appliance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <InputField
            label="Address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
            disabled={loading}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="License Number"
              type="text"
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              disabled={loading}
            />
            <InputField
              label="Hourly Rate"
              type="number"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              disabled={loading}
            />
          </div>

          <InputField
            label="Insurance Information"
            type="text"
            value={formData.insurance_info}
            onChange={(e) => setFormData({ ...formData, insurance_info: e.target.value })}
            disabled={loading}
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
              {loading ? 'Adding Vendor...' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}