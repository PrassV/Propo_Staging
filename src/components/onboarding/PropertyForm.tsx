import { useState } from 'react';
import InputField from '../auth/InputField';

interface PropertyFormProps {
  onSubmit: (property: {
    propertyName: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    surveyNumber: string;
    doorNumber: string;
  }) => void;
  onCancel: () => void;
}

const PropertyForm = ({ onSubmit, onCancel }: PropertyFormProps) => {
  const [formData, setFormData] = useState({
    propertyName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    surveyNumber: '',
    doorNumber: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        label="Property Name"
        type="text"
        value={formData.propertyName}
        onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
        required
      />

      <div className="space-y-4">
        <InputField
          label="Address Line 1"
          type="text"
          value={formData.addressLine1}
          onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
          required
        />
        <InputField
          label="Address Line 2"
          type="text"
          value={formData.addressLine2}
          onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
        />
        <div className="grid grid-cols-3 gap-4">
          <InputField
            label="City"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
          <InputField
            label="State"
            type="text"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            required
          />
          <InputField
            label="Pincode"
            type="text"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          label="Survey Number"
          type="text"
          value={formData.surveyNumber}
          onChange={(e) => setFormData({ ...formData, surveyNumber: e.target.value })}
          required
        />
        <InputField
          label="Door Number"
          type="text"
          value={formData.doorNumber}
          onChange={(e) => setFormData({ ...formData, doorNumber: e.target.value })}
          required
        />
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Add Property
        </button>
      </div>
    </form>
  );
};

export default PropertyForm;