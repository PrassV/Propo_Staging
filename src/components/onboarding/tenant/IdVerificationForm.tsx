import { Upload } from 'lucide-react';
import { TenantFormData } from '../../../types/tenant';

interface IdVerificationFormProps {
  value: TenantFormData;
  onChange: (data: TenantFormData) => void;
  disabled?: boolean;
}

export default function IdVerificationForm({ value, onChange, disabled }: IdVerificationFormProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">ID Verification</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Type <span className="text-red-500">*</span>
          </label>
          <select
            value={value.idType}
            onChange={(e) => onChange({ ...value, idType: e.target.value as 'aadhaar' })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            required
            disabled={disabled}
          >
            <option value="aadhaar">Aadhaar Card</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value.idNumber}
            onChange={(e) => onChange({ ...value, idNumber: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
            placeholder="Enter your Aadhaar number"
            required
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Upload ID Proof <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => onChange({ ...value, idProof: e.target.files?.[0] || null })}
              className="hidden"
              id="id-proof"
              required={!value.idProof}
              disabled={disabled}
            />
            <label htmlFor="id-proof" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <span className="mt-2 block text-sm text-gray-600">
                Click to upload your ID proof
              </span>
              <span className="text-xs text-gray-500">
                (PDF, JPG, PNG)
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}