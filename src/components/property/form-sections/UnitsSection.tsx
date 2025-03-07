import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import InputField from '../../auth/InputField';
import { PropertyUnit } from '../../../types/property';

interface UnitsSectionProps {
  value: PropertyUnit[];
  onChange: (units: PropertyUnit[]) => void;
  disabled?: boolean;
}

export default function UnitsSection({ value, onChange, disabled }: UnitsSectionProps) {
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState<Partial<PropertyUnit>>({});

  const handleAddUnit = () => {
    if (!newUnit.unit_number || !newUnit.floor_number) return;

    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        unit_number: newUnit.unit_number,
        floor_number: newUnit.floor_number,
        size_sqft: newUnit.size_sqft || 0,
        bedrooms: newUnit.bedrooms || 1,
        bathrooms: newUnit.bathrooms || 1,
        rent_amount: newUnit.rent_amount || 0,
        is_occupied: false
      }
    ]);

    setNewUnit({});
    setShowAddUnit(false);
  };

  const handleRemoveUnit = (unitId: string) => {
    onChange(value.filter(unit => unit.id !== unitId));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Property Units</h3>
        {!showAddUnit && (
          <button
            type="button"
            onClick={() => setShowAddUnit(true)}
            className="flex items-center space-x-2 text-black hover:text-gray-600"
            disabled={disabled}
          >
            <Plus size={20} />
            <span>Add Unit</span>
          </button>
        )}
      </div>

      {/* Units List */}
      <div className="space-y-4">
        {value.map(unit => (
          <div key={unit.id} className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Unit {unit.unit_number}</h4>
                <button
                  type="button"
                  onClick={() => handleRemoveUnit(unit.id)}
                  className="text-gray-400 hover:text-red-500"
                  disabled={disabled}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>Floor: {unit.floor_number}</p>
                <p>Size: {unit.size_sqft} sqft</p>
                <p>Bedrooms: {unit.bedrooms} | Bathrooms: {unit.bathrooms}</p>
                <p>Rent: ₹{unit.rent_amount}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Unit Form */}
      {showAddUnit && (
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Add New Unit</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Unit Number"
              type="text"
              value={newUnit.unit_number || ''}
              onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })}
              required
            />
            <InputField
              label="Floor Number"
              type="number"
              value={newUnit.floor_number?.toString() || ''}
              onChange={(e) => setNewUnit({ ...newUnit, floor_number: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Size (sqft)"
              type="number"
              value={newUnit.size_sqft?.toString() || ''}
              onChange={(e) => setNewUnit({ ...newUnit, size_sqft: parseInt(e.target.value) })}
            />
            <InputField
              label="Rent Amount"
              type="number"
              value={newUnit.rent_amount?.toString() || ''}
              onChange={(e) => setNewUnit({ ...newUnit, rent_amount: parseInt(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <select
                value={newUnit.bedrooms?.toString() || '1'}
                onChange={(e) => setNewUnit({ ...newUnit, bedrooms: parseInt(e.target.value) })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <select
                value={newUnit.bathrooms?.toString() || '1'}
                onChange={(e) => setNewUnit({ ...newUnit, bathrooms: parseInt(e.target.value) })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              >
                {[1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setShowAddUnit(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddUnit}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Add Unit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}