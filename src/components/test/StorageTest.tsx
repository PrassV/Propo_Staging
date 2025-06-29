import React, { useState } from 'react';
import { uploadFileToBucket, UploadResult } from '../../api/services/storageService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';

export default function StorageTest() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const metadata = {
        propertyId: 'test-property-123',
        category: 'test'
      };

      const result = await uploadFileToBucket(
        file,
        'property_images', // Use the storage context
        undefined, // No custom folder path
        metadata
      );

      setResult(result);
      
      if (result.success) {
        toast.success('File uploaded successfully!');
      } else {
        toast.error(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Storage Service Test</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Select a file to test upload:
          </label>
          <Input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            disabled={uploading}
          />
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Test Upload'}
        </Button>

        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <h4 className="font-medium mb-2">Upload Result:</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 