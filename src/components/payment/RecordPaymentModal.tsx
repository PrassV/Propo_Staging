import React, { useState, useEffect, ChangeEvent } from 'react';
import { X } from 'lucide-react';
import InputField from '../auth/InputField';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentCreate, DocumentCreate, Payment, Tenant } from '../../api/types';
import { getTenants } from '../../api/services/tenantService';
import { uploadFile } from '../../api/services/uploadService';

interface TenantDisplayInfo {
  id: string;
  name: string;
  unitNumber?: string;
}

interface UploadedFileInfo {
  url: string;
  fileName: string;
  fileType: string;
  size: number;
}

interface RecordPaymentModalProps {
  propertyId: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export default function RecordPaymentModal({ propertyId, onClose, onSubmitSuccess }: RecordPaymentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantOptions, setTenantOptions] = useState<TenantDisplayInfo[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    paymentType: 'rent' as 'rent' | 'deposit' | 'maintenance' | 'other',
    tenantId: '',
    amount: '',
    dueDate: '',
    description: '',
  });

  useEffect(() => {
    fetchTenantData(propertyId);
  }, [propertyId]);

  const fetchTenantData = async (propId: string) => {
    if (!propId) return;
    setLoadingTenants(true);
    setError(null);
    setTenantOptions([]);
    try {
      const tenantsResponse = await getTenants({ property_id: propId });
      const tenants = tenantsResponse.items || [];

      const displayOptions: TenantDisplayInfo[] = tenants.map(tenant => ({
          id: tenant.id,
          name: tenant.name,
          unitNumber: tenant.unit_number
      }));
      
      setTenantOptions(displayOptions);

    } catch (err) {
      console.error('Error fetching tenants:', err);
      const message = err instanceof Error ? err.message : 'Failed to load tenant information.';
      setError(message);
      toast.error(message);
      setTenantOptions([]);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files.length > 0 ? [e.target.files[0]] : []);
    }
  };

  const removeFile = () => {
    setFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.amount) {
      toast.error('Please select a tenant and enter an amount.');
      return;
    }
    if (!user || !propertyId) {
        toast.error('User not authenticated or property not provided.');
        return;
    }

    setLoading(true);
    setError(null);
    let createdPayment: Payment | null = null;
    let uploadedFileInfo: UploadedFileInfo | null = null;

    try {
      if (files.length > 0) {
        toast.loading('Uploading file...');
        const file = files[0]; 
        const url = await uploadFile(file, 'payment_document', formData.tenantId);
        uploadedFileInfo = { 
            url: url, 
            fileName: file.name, 
            fileType: file.type, 
            size: file.size 
        };
        toast.dismiss();
      }

      const paymentAPIData: PaymentCreate = {
        property_id: propertyId,
        tenant_id: formData.tenantId,
        amount: parseFloat(formData.amount) || 0,
        due_date: formData.dueDate || new Date().toISOString().split('T')[0],
        payment_type: formData.paymentType,
        description: formData.description || `${formData.paymentType} payment recorded`,
      };

      toast.loading('Recording payment...');
      createdPayment = await api.payment.createPayment(paymentAPIData);
      toast.dismiss();

      if (createdPayment?.id && uploadedFileInfo) {
        toast.loading('Linking document...');
        const fileInfo = uploadedFileInfo;
        const docData: DocumentCreate = {
          title: fileInfo.fileName,
          payment_id: createdPayment.id,
          property_id: propertyId,
          tenant_id: formData.tenantId,
          file_url: fileInfo.url,
          file_name: fileInfo.fileName,
          file_type: fileInfo.fileType,
          file_size: fileInfo.size,
          document_type: 'payment_receipt',
          access_level: 'private',
        };
        await api.document.createDocument(docData);
        toast.dismiss();
      }

      toast.success('Payment recorded successfully');
      onSubmitSuccess();
      onClose();

    } catch (error: unknown) {
      toast.dismiss();
      console.error('Error recording payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to record payment';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Record Payment / Bill</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" disabled={loading}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              name="paymentType"
              value={formData.paymentType}
              onChange={(e) => setFormData({ 
                  ...formData, 
                  paymentType: e.target.value as 'rent' | 'deposit' | 'maintenance' | 'other' 
              })}
              className="mt-1 w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={loading}
            >
              <option value="rent">Rent</option>
              <option value="deposit">Deposit</option>
              <option value="maintenance">Maintenance Fee</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Tenant</label>
            <select
              name="tenantId"
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="mt-1 w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              required
              disabled={loading || loadingTenants}
            >
              <option value="">{loadingTenants ? 'Loading...' : 'Select Tenant'}</option>
              {tenantOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} {option.unitNumber ? `(Unit ${option.unitNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          <InputField
            label="Amount"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            min="0"
            disabled={loading}
          />

          <InputField
            label="Payment/Due Date"
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            disabled={loading}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 w-full p-3 border rounded-lg focus:outline-none focus:border-black"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Upload Receipt/Document (Optional)</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-700 disabled:opacity-50"
              disabled={loading}
            />
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                 {files.map((file, index) => (
                  <div key={index} className="flex justify-between items-center text-xs bg-gray-100 px-2 py-1 rounded">
                    <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    <button 
                      type="button" 
                      onClick={removeFile} 
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

          {error && (
             <div className="text-center text-red-500 text-sm">
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}