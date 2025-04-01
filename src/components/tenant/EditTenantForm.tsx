import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import InputField from '../auth/InputField';
import { Tenant, TenantUpdate, Gender, IdType } from '../../types/tenant';
import RentalDetailsForm from './RentalDetailsForm';
import UtilityDetailsForm from './UtilityDetailsForm';
import TenantDocumentSection from './form-sections/TenantDocumentSection';
import toast from 'react-hot-toast';
import { updateTenant } from '../../api/services/tenantService';

interface EditTenantFormProps {
  tenant: Tenant;
  onSave: () => void;
  onCancel: () => void;
}

export default function EditTenantForm({ tenant, onSave, onCancel }: EditTenantFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant.name || '',
    phone: tenant.phone || '',
    email: tenant.email || '',
    familySize: tenant.family_size?.toString() || '',
    permanentAddress: tenant.permanent_address || '',
    rental_details: {
      rental_type: tenant.rental_type as 'rent' | 'lease' | undefined,
      rental_frequency: tenant.rental_frequency,
      rental_amount: tenant.rental_amount?.toString() || '',
      advance_amount: tenant.advance_amount?.toString() || '',
      rental_start_date: tenant.rental_start_date,
      rental_end_date: tenant.rental_end_date,
      lease_amount: tenant.lease_amount?.toString() || '',
      lease_start_date: tenant.lease_start_date,
      lease_end_date: tenant.lease_end_date
    },
    utility_details: {
      maintenanceCharges: tenant.maintenance_fee?.toString() || '',
      electricity_responsibility: tenant.electricity_responsibility || 'tenant',
      water_responsibility: tenant.water_responsibility || 'tenant',
      noticePeriod: tenant.notice_period_days?.toString() || '30'
    },
    dob: tenant.dob || '',
    gender: tenant.gender || '',
    id_type: tenant.id_type || '',
    id_number: tenant.id_number || '',
    university: tenant.university || '',
  });

  useEffect(() => {
    if (tenant) {
       setFormData({
        name: tenant.name || '',
        phone: tenant.phone || '',
        email: tenant.email || '',
        familySize: tenant.family_size?.toString() || '',
        permanentAddress: tenant.permanent_address || '',
        rental_details: {
          rental_type: tenant.rental_type,
          rental_frequency: tenant.rental_frequency,
          rental_amount: tenant.rental_amount?.toString() || '',
          advance_amount: tenant.advance_amount?.toString() || '',
          rental_start_date: tenant.rental_start_date,
          rental_end_date: tenant.rental_end_date,
          lease_amount: tenant.lease_amount?.toString() || '',
          lease_start_date: tenant.lease_start_date,
          lease_end_date: tenant.lease_end_date
        },
        utility_details: {
          maintenanceCharges: tenant.maintenance_fee?.toString() || '',
          electricity_responsibility: tenant.electricity_responsibility || 'tenant',
          water_responsibility: tenant.water_responsibility || 'tenant',
          noticePeriod: tenant.notice_period_days?.toString() || '30'
        },
        dob: tenant.dob || '',
        gender: tenant.gender || '',
        id_type: tenant.id_type || '',
        id_number: tenant.id_number || '',
        university: tenant.university || '',
       });
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Updating tenant...');

    try {
       const tenantUpdateData: TenantUpdate = {
         name: formData.name || undefined,
         phone: formData.phone || undefined,
         email: formData.email || undefined,
         family_size: formData.familySize ? parseInt(formData.familySize) : undefined,
         permanent_address: formData.permanentAddress || undefined,
         dob: formData.dob || undefined,
         gender: formData.gender as Gender || undefined,
         id_type: formData.id_type as IdType || undefined,
         id_number: formData.id_number || undefined,
         university: formData.university || undefined,

         rental_type: formData.rental_details.rental_type || undefined,
         rental_frequency: formData.rental_details.rental_frequency || undefined,
         rental_amount: formData.rental_details.rental_amount ? parseFloat(formData.rental_details.rental_amount) : undefined,
         advance_amount: formData.rental_details.advance_amount ? parseFloat(formData.rental_details.advance_amount) : undefined,
         rental_start_date: formData.rental_details.rental_start_date || undefined,
         rental_end_date: formData.rental_details.rental_end_date || undefined,
         lease_amount: formData.rental_details.lease_amount ? parseFloat(formData.rental_details.lease_amount) : undefined,
         lease_start_date: formData.rental_details.lease_start_date || undefined,
         lease_end_date: formData.rental_details.lease_end_date || undefined,

         maintenance_fee: formData.utility_details.maintenanceCharges ? parseFloat(formData.utility_details.maintenanceCharges) : undefined,
         electricity_responsibility: formData.utility_details.electricity_responsibility || undefined,
         water_responsibility: formData.utility_details.water_responsibility || undefined,
         notice_period_days: formData.utility_details.noticePeriod ? parseInt(formData.utility_details.noticePeriod) : undefined,
       };
       
       Object.keys(tenantUpdateData).forEach(key => {
           if (tenantUpdateData[key as keyof TenantUpdate] === undefined) {
               delete tenantUpdateData[key as keyof TenantUpdate];
           }
       });

       await updateTenant(tenant.id, tenantUpdateData);

       toast.success('Tenant details updated successfully', { id: toastId });
       onSave();
    } catch (error: unknown) {
       console.error('Error updating tenant:', error);
       let errorMessage = 'Failed to update tenant';
       if (error instanceof Error) {
           errorMessage = error.message;
       } else if (typeof error === 'object' && error !== null && 'response' in error) {
           const responseError = error as { response?: { data?: { detail?: string } } };
           errorMessage = responseError.response?.data?.detail || 'Failed to update tenant';
       }
       toast.error(errorMessage, { id: toastId });
    } finally {
       setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-xl font-semibold">Edit Tenant Details</h2>
        <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-gray-200"><X size={20} /></button>
      </div>

      <h3 className="text-lg font-medium text-gray-700 pt-4">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="Tenant Name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} />
        <InputField label="Phone Number" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required disabled={loading} />
        <InputField label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={loading} />
        <InputField label="Family Size" type="number" min="1" value={formData.familySize} onChange={(e) => setFormData({ ...formData, familySize: e.target.value })} required disabled={loading} />
      </div>
      <InputField label="Permanent Address" type="text" value={formData.permanentAddress} onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })} required disabled={loading} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <InputField label="Date of Birth" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} disabled={loading} />
         <InputField label="Gender" type="text" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} disabled={loading} placeholder="e.g., male, female, other" /> 
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="ID Type" type="text" value={formData.id_type} onChange={(e) => setFormData({ ...formData, id_type: e.target.value })} disabled={loading} placeholder="e.g., passport, national_id" />
        <InputField label="ID Number" type="text" value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} disabled={loading} />
      </div>
       <InputField label="University (Optional)" type="text" value={formData.university} onChange={(e) => setFormData({ ...formData, university: e.target.value })} disabled={loading} />

      <h3 className="text-lg font-medium text-gray-700 pt-4">Rental Details</h3>
      <RentalDetailsForm
        value={formData.rental_details}
        onChange={(details) => setFormData({ ...formData, rental_details: details })}
        disabled={loading}
      />

      <h3 className="text-lg font-medium text-gray-700 pt-4">Utility & Other Details</h3>
      <UtilityDetailsForm
        value={formData.utility_details} 
        onChange={(details) => setFormData({ ...formData, utility_details: details })}
        disabled={loading}
      />

      {tenant?.id && (
          <TenantDocumentSection tenantId={tenant.id} />
      )}

      <div className="flex justify-end space-x-4 pt-6">
         <button type="button" onClick={onCancel} disabled={loading} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50">
           Cancel
         </button>
         <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
           {loading ? 'Saving...' : 'Save Changes'}
         </button>
      </div>
    </form>
  );
}