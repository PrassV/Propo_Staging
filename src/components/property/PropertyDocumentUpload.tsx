import { Upload } from 'lucide-react';

interface PropertyDocumentUploadProps {
  onFileSelect: (file: File | null) => void;
  error?: string;
}

const PropertyDocumentUpload = ({ onFileSelect, error }: PropertyDocumentUploadProps) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Property Document <span className="text-red-500">*</span>
      </label>
      <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
        error ? 'border-red-500' : ''
      }`}>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
          className="hidden"
          id="property-document"
          required
        />
        <label htmlFor="property-document" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <span className="mt-2 block text-sm text-gray-600">
            Click to upload property document
          </span>
          <span className="text-xs text-gray-500">
            (PDF, JPG, JPEG, PNG)
          </span>
        </label>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};

export default PropertyDocumentUpload;