import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X } from 'lucide-react';
import { getImageUrl } from '../../utils/storage';

interface ImageUploadSectionProps {
  images: File[];
  existingImages: {
    urls: string[];
    paths: string[];
  };
  onChange: (images: File[]) => void;
  onExistingImagesChange: (urls: string[], paths: string[]) => void;
  disabled?: boolean;
}

export default function ImageUploadSection({
  images,
  existingImages,
  onChange,
  onExistingImagesChange,
  disabled
}: ImageUploadSectionProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onChange([...images, ...acceptedFiles]);
  }, [images, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    disabled,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeNewImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  const removeExistingImage = (index: number) => {
    const newUrls = [...existingImages.urls];
    const newPaths = [...existingImages.paths];
    newUrls.splice(index, 1);
    newPaths.splice(index, 1);
    onExistingImagesChange(newUrls, newPaths);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Property Images</h3>
      
      {/* Existing Images */}
      {existingImages.urls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {existingImages.urls.map((url, index) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Property ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeExistingImage(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New Images Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {images.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Upload ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeNewImage(index)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <p className="text-gray-600">
          {isDragActive
            ? 'Drop the images here...'
            : 'Drag & drop images here, or click to select'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Supported formats: JPEG, PNG, WebP (Max size: 10MB)
        </p>
      </div>
    </div>
  );
} 
