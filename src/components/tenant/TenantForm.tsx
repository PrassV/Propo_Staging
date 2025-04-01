import { useState, ChangeEvent } from 'react';
import { X } from 'lucide-react';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';
import { TenantFormData, RentalDetails, UtilityDetails } from '../../types/tenant';

interface TenantFormProps {
  onSubmit: (data: TenantFormData & { documents?: File[] }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const defaultUtilityDetails: UtilityDetails = {
  electricity_responsibility: 'tenant',
  water_responsibility: 'tenant',
  property_tax_responsibility: 'tenant',
  maintenance_fee: 0,
  notice_period_days: 30, 
};

const defaultRentalDetails: RentalDetails = {
  rental_type: 'rent',
  rental_frequency: undefined,
  rental_amount: '',
  maintenance_fee: '',
  advance_amount: '',
  rental_start_date: '',
  rental_end_date: '',
  lease_amount: '',
  lease_start_date: '',
  lease_end_date: '',
};

const TenantForm = ({ onSubmit, onCancel, isSubmitting = false }: TenantFormProps) => {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male',
    familySize: '',
    permanentAddress: '',
    idType: 'aadhaar',
    idNumber: '',
    idProof: null,
    rental_details: defaultRentalDetails,
    utility_details: defaultUtilityDetails,
    tenantType: 'individual',
    moveInDate: '',
    leaseEndDate: '',
    rentAmount: undefined,
    rentFrequency: 'monthly',
  });

  const [documents, setDocuments] = useState<File[]>([]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith('rental_details.')) {
      const key = name.split('.')[1];
      const processedValue = type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value;
      setFormData(prev => ({
        ...prev,
        rental_details: { ...prev.rental_details, [key]: processedValue },
      }));
    } else if (name.startsWith('utility_details.')) {
      const key = name.split('.')[1];
      const processedValue = type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value;
      setFormData(prev => ({
        ...prev,
        utility_details: { ...prev.utility_details, [key]: processedValue },
      }));
    } else {
      const processedValue = type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value;
      setFormData(prev => ({ ...prev, [name]: processedValue }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Name and Email are required.');
      return;
    }

    try {
      await onSubmit({ ...formData, documents });
    } catch (error) {
      console.error("Error occurred during tenant submission process:", error);
    }
  };

  const isDisabled = isSubmitting;

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

      <InputField
        label="Tenant Name"
        type="text"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        required
        disabled={isDisabled}
      />
      <InputField
        label="Phone Number"
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleInputChange}
        disabled={isDisabled}
      />
      <InputField
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
        required
        disabled={isDisabled}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Tenant Type</label>
        <select
          name="tenantType"
          value={formData.tenantType}
          onChange={handleInputChange}
          className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
          disabled={isDisabled}
        >
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Move-in Date"
          type="date"
          name="moveInDate"
          value={formData.moveInDate ?? ''}
          onChange={handleInputChange}
          disabled={isDisabled}
        />
        <InputField
          label="Lease End Date"
          type="date"
          name="leaseEndDate"
          value={formData.leaseEndDate ?? ''}
          onChange={handleInputChange}
          disabled={isDisabled}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Rent Amount"
          type="number"
          name="rentAmount"
          value={formData.rentAmount?.toString() ?? ''}
          onChange={handleInputChange}
          min="0"
          disabled={isDisabled}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Rent Frequency</label>
          <select
            name="rentFrequency"
            value={formData.rentFrequency}
            onChange={handleInputChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            disabled={isDisabled}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Upload Documents (Optional)</label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-700 disabled:opacity-50"
          disabled={isDisabled}
        />
        {documents.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium">Selected files:</p>
            {documents.map((file, index) => (
              <div key={index} className="flex justify-between items-center text-xs bg-gray-100 px-2 py-1 rounded">
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                <button 
                  type="button" 
                  onClick={() => removeFile(index)} 
                  className="text-red-500 hover:text-red-700"
                  disabled={isDisabled}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          disabled={isDisabled}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          disabled={isDisabled}
        >
          {isSubmitting ? 'Adding Tenant...' : 'Add Tenant'}
        </button>
      </div>
    </form>
  );
};

export default TenantForm;