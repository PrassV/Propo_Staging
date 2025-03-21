import { useState } from 'react';
import { X } from 'lucide-react';
import { MaintenanceCategory, MaintenancePriority } from '../../types/maintenance';
import { useAuth } from '../../contexts/AuthContext';
import { useMaintenanceApi } from '../../hooks/useMaintenanceApi';
import PropertySelect from './forms/PropertySelect';
import UnitSelect from './forms/UnitSelect';
import TenantSelect from './forms/TenantSelect';
import VendorSelect from './forms/VendorSelect';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';

interface NewRequestModalProps {
  onClose: () => void;
  onSubmit: () => void;
}

const NewRequestModal = ({ onClose, onSubmit }: NewRequestModalProps) => {
  const { user } = useAuth();
  const { createRequest } = useMaintenanceApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: '',
    unitNumber: '',
    tenantId: '',
    title: '',
    description: '',
    priority: 'normal' as MaintenancePriority,
    category: '' as MaintenanceCategory,
    estimatedCost: '',
    vendorId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.propertyId) return;
    
    setLoading(true);
    try {
      const result = await createRequest({
        property_id: formData.propertyId,
        tenant_id: formData.tenantId || undefined,
        title: formData.title,
        description: formData.description,
        priority: mapPriority(formData.priority),
        category: formData.category,
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Maintenance request created successfully');
      onSubmit();
    } catch (error: unknown) {
      console.error('Error creating request:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create request';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Map from local priority values to API priority values
  const mapPriority = (priority: MaintenancePriority): 'low' | 'medium' | 'high' | 'emergency' => {
    switch (priority) {
      case 'normal': return 'medium';
      case 'urgent': return 'high';
      case 'emergency': return 'emergency';
      case 'low': return 'low';
      default: return 'medium';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">New Maintenance Request</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
              <PropertySelect
                value={formData.propertyId}
                onChange={(value) => setFormData({ ...formData, propertyId: value, unitNumber: '', tenantId: '' })}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <UnitSelect
                propertyId={formData.propertyId}
                value={formData.unitNumber}
                onChange={(value) => setFormData({ ...formData, unitNumber: value, tenantId: '' })}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
            <TenantSelect
              propertyId={formData.propertyId}
              unitNumber={formData.unitNumber}
              value={formData.tenantId}
              onChange={(value) => setFormData({ ...formData, tenantId: value })}
              disabled={loading}
            />
          </div>

          <InputField
            label="Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              rows={4}
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as MaintenancePriority })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
                required
                disabled={loading}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as MaintenanceCategory })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
                required
                disabled={loading}
              >
                <option value="">Select Category</option>
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="carpentry">Carpentry</option>
                <option value="painting">Painting</option>
                <option value="appliance">Appliance</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <InputField
            label="Estimated Cost (optional)"
            type="number"
            value={formData.estimatedCost}
            onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
            disabled={loading}
          />

          <VendorSelect
            category={formData.category as MaintenanceCategory}
            value={formData.vendorId}
            onChange={(value) => setFormData({ ...formData, vendorId: value })}
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
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRequestModal;