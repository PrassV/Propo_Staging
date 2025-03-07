import { useState, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadPropertyImages } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ImageUploadSectionProps {
  propertyId?: string;
  images: File[];
  onChange: (images: File[]) => void;
  disabled?: boolean;
}

// Add this interface to extend the File type with our custom property
interface ExtendedFile extends File {
  uploadedPath?: string;
}

export default function ImageUploadSection({ propertyId, images, onChange, disabled }: ImageUploadSectionProps) {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!user) return;
    
    // Validate files
    const validFiles = Array.from(files).filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      
      // Check file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const imagePaths = await uploadPropertyImages(validFiles, user.id);
      
      // Create new File objects with the uploaded paths attached
      const uploadedFiles = validFiles.map((file, index) => {
        const extendedFile = file as ExtendedFile;
        extendedFile.uploadedPath = imagePaths[index];
        return extendedFile;
      });
      
      onChange([...images, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} images uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [user, images, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files?.length) {
      handleFiles(Array.from(e.target.files));
    }
  }, [handleFiles]);

  const removeImage = useCallback((index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  }, [images, onChange]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Property Images</h3>

      {/* Image Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {images.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled || uploading}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-black bg-gray-50' : 'border-gray-300'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
          id="property-images"
          disabled={disabled || uploading}
        />
        <label
          htmlFor="property-images"
          className={`cursor-pointer ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Drag and drop your images here, or click to select files'}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: JPG, PNG (max 10MB per file)
          </p>
        </label>
      </div>
    </div>
  );
}