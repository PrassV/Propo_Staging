import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function DocumentUpload({ value, onChange, disabled }: DocumentUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    onChange(file);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Property Document</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload property registration document, title deed, or other relevant documents
      </p>

      <div className="border-2 border-dashed rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileChange}
          className="hidden"
          id="property-document"
          disabled={disabled}
        />
        <label
          htmlFor="property-document"
          className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {value ? (
            <p className="text-sm text-gray-600">
              Selected file: {value.name}
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Click to upload property document
              </p>
              <p className="text-xs text-gray-500 mt-2">
                PDF, JPG, PNG (max 5MB)
              </p>
            </>
          )}
        </label>
      </div>
    </div>
  );
}