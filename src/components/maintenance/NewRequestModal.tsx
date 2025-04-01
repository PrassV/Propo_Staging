import { useState, ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { MaintenanceCategory, MaintenancePriority } from '../../types/maintenance';
import { useAuth } from '../../contexts/AuthContext';
import PropertySelect from './forms/PropertySelect';
import UnitSelect from './forms/UnitSelect';
import TenantSelect from './forms/TenantSelect';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';
import api from '../../api';
import { supabase } from '../../lib/supabase';
import { MaintenanceRequestCreate, DocumentCreate, MaintenanceRequest } from '../../api/types';

interface UploadedFileInfo {
  url: string;
  fileName: string;
  fileType: string;
  size: number;
}

interface NewRequestModalProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const NewRequestModal = ({ onClose, onSubmitSuccess }: NewRequestModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    propertyId: string;
    unitNumber: string;
    tenantId: string;
    title: string;
    description: string;
    priority: MaintenancePriority;
    category: MaintenanceCategory | '';
  }>({
    propertyId: '',
    unitNumber: '',
    tenantId: '',
    title: '',
    description: '',
    priority: 'normal',
    category: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.propertyId || !formData.title || !formData.category) {
        toast.error("Property, Title, and Category are required.");
        return;
    }
    
    setLoading(true);
    let createdRequest: MaintenanceRequest | null = null;
    const uploadedFileUrls: UploadedFileInfo[] = [];

    try {
      if (files.length > 0) {
        toast.loading('Uploading files...');
        const uploadPromises = files.map(async (file) => {
           const fileExt = file.name.split('.').pop();
           const filePath = `maintenance-files/${user.id}/${formData.propertyId}/${Date.now()}.${fileExt}`;
           const { error: uploadError } = await supabase.storage
            .from('maintenance-files') 
            .upload(filePath, file);
           if (uploadError) throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
           const { data: urlData } = supabase.storage.from('maintenance-files').getPublicUrl(filePath);
           if (!urlData?.publicUrl) {
               console.warn(`Could not get public URL for ${filePath}`);
               return null;
           }
           return { url: urlData.publicUrl, fileName: file.name, fileType: file.type, size: file.size };
        });
        const uploadResults = await Promise.all(uploadPromises);
        uploadedFileUrls.push(...uploadResults.filter(f => f !== null) as UploadedFileInfo[]);
        toast.dismiss();
        if (uploadedFileUrls.length !== files.length) {
             toast.error('Some files failed to upload or retrieve URL.');
        }
      }

      const requestAPIData: MaintenanceRequestCreate = {
        property_id: formData.propertyId,
        tenant_id: formData.tenantId || undefined,
        title: formData.title,
        description: formData.description,
        priority: mapPriority(formData.priority),
        category: formData.category,
      };

      toast.loading('Creating request...');
      createdRequest = await api.maintenance.createMaintenanceRequest(requestAPIData);
      toast.dismiss();

      if (createdRequest?.id && uploadedFileUrls.length > 0) { 
        toast.loading('Linking files...');
        const linkPromises = uploadedFileUrls.map(fileInfo => {
          const docData: DocumentCreate = {
            title: fileInfo.fileName,
            maintenance_request_id: createdRequest!.id,
            property_id: formData.propertyId,
            tenant_id: formData.tenantId || undefined,
            file_url: fileInfo.url,
            file_name: fileInfo.fileName,
            file_type: fileInfo.fileType,
            file_size: fileInfo.size,
            document_type: fileInfo.fileType.startsWith('image/') ? 'MAINTENANCE_IMAGE' : 'MAINTENANCE_DOCUMENT',
            access_level: 'PRIVATE',
          };
          return api.document.createDocument(docData);
        });
        await Promise.all(linkPromises);
        toast.dismiss();
      }

      toast.success('Maintenance request created successfully');
      onSubmitSuccess();
      onClose();

    } catch (error: unknown) {
      toast.dismiss();
      console.error('Error creating maintenance request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create request';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Upload Images/Documents (Optional)</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-700 disabled:opacity-50"
              disabled={loading}
            />
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium">Selected files:</p>
                {files.map((file, index) => (
                  <div key={index} className="flex justify-between items-center text-xs bg-gray-100 px-2 py-1 rounded">
                    <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                      disabled={loading}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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