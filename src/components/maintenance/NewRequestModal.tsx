import React, { useState, ChangeEvent, useEffect } from 'react';
import { MaintenanceCategory, MaintenancePriority, MaintenanceRequestCreate, DocumentCreate, MaintenanceRequest, Property, PropertyUnit, Tenant } from '../../api/types';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../../api';
import { uploadFile } from '../../api/services/uploadService';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { getProperties, getUnitsForProperty } from '@/api/services/propertyService';
import { getTenants } from '@/api/services/tenantService';

interface UploadedFileInfo {
  url: string;
  fileName: string;
  fileType: string;
  size: number;
}

interface NewRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess: () => void;
}

const NewRequestModal = ({ open, onOpenChange, onSubmitSuccess }: NewRequestModalProps) => {
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
    priority: 'medium',
    category: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState<boolean>(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  const [units, setUnits] = useState<PropertyUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState<boolean>(false);
  const [unitError, setUnitError] = useState<string | null>(null);

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState<boolean>(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoadingProperties(true);
      setPropertyError(null);
      try {
        const response = await getProperties();
        setProperties(response.items || []);
      } catch (err: unknown) {
        console.error('Error fetching properties:', err);
        setPropertyError(err instanceof Error ? err.message : 'Failed to load properties.');
        setProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    };
    fetchProperties();
  }, []);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!formData.propertyId) {
        setUnits([]);
        setTenants([]); 
        setFormData(prev => ({ ...prev, unitNumber: '', tenantId: '' })); 
        return;
      }
      setLoadingUnits(true);
      setUnitError(null);
      setTenants([]); 
      setFormData(prev => ({ ...prev, unitNumber: '', tenantId: '' })); 
      try {
        const fetchedUnits = await getUnitsForProperty(formData.propertyId);
        setUnits(fetchedUnits || []);
      } catch (err: unknown) {
        console.error('Error fetching units:', err);
        setUnitError(err instanceof Error ? err.message : 'Failed to load units.');
        setUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    };
    fetchUnits();
  }, [formData.propertyId]);

  useEffect(() => {
    const fetchTenantsForProperty = async () => {
      if (!formData.propertyId) {
         setTenants([]);
         return;
      }
      if (loadingUnits || unitError) {
          setTenants([]); 
          return;
      }
      setLoadingTenants(true);
      setTenantError(null);
      try {
        const response = await getTenants({ property_id: formData.propertyId });
        setTenants(response.items || []);
      } catch (err: unknown) {
        console.error('Error fetching tenants:', err);
        setTenantError(err instanceof Error ? err.message : 'Failed to load tenants.');
        setTenants([]);
      } finally {
        setLoadingTenants(false);
      }
    };
    fetchTenantsForProperty();
  }, [formData.propertyId, loadingUnits, unitError]); 
  
  const availableTenantsForUnit = React.useMemo(() => {
    if (!formData.unitNumber) return [];
    const selectedUnit = units.find(u => u.unit_number === formData.unitNumber);
    if (!selectedUnit || !selectedUnit.tenant_id) return []; 
    return tenants.filter(t => t.id === selectedUnit.tenant_id);
  }, [formData.unitNumber, tenants, units]);

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
    const uploadedFileInfos: UploadedFileInfo[] = [];

    try {
      if (files.length > 0) {
        toast.loading('Uploading files...');
        const uploadPromises = files.map(async (file) => {
           const url = await uploadFile(file, 'maintenance_request', formData.propertyId);
           return { url: url, fileName: file.name, fileType: file.type, size: file.size };
        });
        const results = await Promise.all(uploadPromises);
        uploadedFileInfos.push(...results);
        toast.dismiss();
      }

      const requestAPIData: MaintenanceRequestCreate = {
        property_id: formData.propertyId,
        tenant_id: formData.tenantId || undefined,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category as MaintenanceCategory,
      };

      toast.loading('Creating request...');
      createdRequest = await api.maintenance.createMaintenanceRequest(requestAPIData);
      toast.dismiss();

      if (createdRequest?.id && uploadedFileInfos.length > 0) { 
        toast.loading('Linking files...');
        const linkPromises = uploadedFileInfos.map(fileInfo => {
          const docData: DocumentCreate = {
            document_name: fileInfo.fileName,
            title: fileInfo.fileName,
            maintenance_request_id: createdRequest!.id,
            property_id: formData.propertyId,
            tenant_id: formData.tenantId || undefined,
            file_url: fileInfo.url,
            file_name: fileInfo.fileName,
            mime_type: fileInfo.fileType,
            file_size: fileInfo.size,
            file_extension: fileInfo.fileName.split('.').pop(),
            document_type: fileInfo.fileType.startsWith('image/') ? 'maintenance_photo' : 'other',
            access_level: 'private',
          };
          return api.document.createDocument(docData);
        });
        await Promise.all(linkPromises);
        toast.dismiss();
      }

      toast.success('Maintenance request created successfully');
      onSubmitSuccess();
      onOpenChange(false);

    } catch (error: unknown) {
      toast.dismiss();
      console.error('Error creating maintenance request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create request';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
        onOpenChange(false);
        setFormData({ 
            propertyId: '', unitNumber: '', tenantId: '', title: '', 
            description: '', priority: 'medium', category: '' 
        });
        setFiles([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">New Maintenance Request</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property">Property *</Label>
              <Select 
                value={formData.propertyId} 
                onValueChange={(value) => {
                  setFormData({ ...formData, propertyId: value, unitNumber: '', tenantId: '' });
                }}
                disabled={loadingProperties || loading}
              >
                <SelectTrigger id="property">
                  <SelectValue placeholder="Select Property..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingProperties && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                  {propertyError && <SelectItem value="error" disabled>Error loading</SelectItem>}
                  {!loadingProperties && !propertyError && properties.length === 0 && (
                    <SelectItem value="no-props" disabled>No properties found</SelectItem>
                  )}
                  {!loadingProperties && !propertyError && properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {propertyError && <p className="text-xs text-red-600">{propertyError}</p>}
            </div>

            <div className="space-y-2">
               <Label htmlFor="unit">Unit</Label>
               <Select 
                 value={formData.unitNumber}
                 onValueChange={(value) => {
                     setFormData({ ...formData, unitNumber: value, tenantId: '' });
                 }}
                 disabled={!formData.propertyId || loadingUnits || !!unitError || loading}
               >
                 <SelectTrigger id="unit"><SelectValue placeholder="Select Unit..." /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="placeholder" disabled>Select property first</SelectItem>
                   {loadingUnits && <SelectItem value="loading" disabled>Loading units...</SelectItem>}
                   {unitError && <SelectItem value="error" disabled>Error loading units</SelectItem>}
                   {!loadingUnits && !unitError && units.length === 0 && formData.propertyId && (
                     <SelectItem value="no-units" disabled>No units found</SelectItem>
                   )}
                   {!loadingUnits && !unitError && !formData.propertyId && (
                     <SelectItem value="placeholder" disabled>Select property first</SelectItem>
                   )}
                   {!loadingUnits && !unitError && units.map((unit) => (
                     <SelectItem key={unit.id} value={unit.unit_number}>
                       {unit.unit_number}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               {unitError && <p className="text-xs text-red-600">{unitError}</p>}
             </div>
          </div>

           <div className="space-y-2">
             <Label htmlFor="tenant">Tenant</Label>
             <Select 
                value={formData.tenantId}
                onValueChange={(value) => {
                    setFormData({ ...formData, tenantId: value });
                }}
                disabled={!formData.unitNumber || loadingTenants || !!tenantError || loading} 
              >
               <SelectTrigger id="tenant"><SelectValue placeholder="Select Tenant..." /></SelectTrigger>
               <SelectContent>
                  <SelectItem value="placeholder" disabled>Select unit first</SelectItem>
                  {loadingTenants && <SelectItem value="loading" disabled>Loading tenants...</SelectItem>}
                  {tenantError && <SelectItem value="error" disabled>Error loading tenants</SelectItem>}
                  {!loadingTenants && !tenantError && !formData.unitNumber && (
                    <SelectItem value="placeholder" disabled>Select unit first</SelectItem>
                  )}
                  {!loadingTenants && !tenantError && availableTenantsForUnit.length === 0 && formData.unitNumber && (
                    <SelectItem value="no-tenant" disabled>No tenant found for this unit</SelectItem>
                  )}
                  {!loadingTenants && !tenantError && availableTenantsForUnit.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
               </SelectContent>
             </Select>
             {tenantError && <p className="text-xs text-red-600">{tenantError}</p>}
           </div>
           
           <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title" 
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={loading}
                placeholder="e.g., Leaking faucet in kitchen"
              />
           </div>

           <div className="space-y-2">
             <Label htmlFor="description">Description *</Label>
             <Textarea
               id="description"
               value={formData.description}
               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
               rows={4}
               required
               disabled={loading}
               placeholder="Provide details about the issue..."
             />
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="priority">Priority *</Label>
               <Select 
                 value={formData.priority} 
                 onValueChange={(value: MaintenancePriority) => {
                    setFormData({ ...formData, priority: value });
                 }}
                 disabled={loading}
                >
                 <SelectTrigger id="priority">
                   <SelectValue placeholder="Select Priority..." />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                 </SelectContent>
               </Select>
             </div>

            <div className="space-y-2">
               <Label htmlFor="category">Category *</Label>
               <Select 
                  value={formData.category} 
                  onValueChange={(value: MaintenanceCategory | '') => {
                      setFormData({ ...formData, category: value });
                  }}
                  disabled={loading}
                >
                 <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category..." />
                 </SelectTrigger>
                 <SelectContent>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="appliances">Appliances</SelectItem>
                    <SelectItem value="painting">Painting</SelectItem>
                    <SelectItem value="carpentry">Carpentry</SelectItem>
                    <SelectItem value="landscaping">Landscaping</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="pest_control">Pest Control</SelectItem>
                    <SelectItem value="roofing">Roofing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

           <div className="space-y-2">
             <Label htmlFor="files">Upload Images/Documents (Optional)</Label>
             <Input
               id="files"
               type="file"
               multiple
               onChange={handleFileChange}
               disabled={loading}
               className="pt-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
             />
             {files.length > 0 && ( 
               <div className="mt-2 space-y-1 text-xs text-muted-foreground"> 
                 {files.map((file, index) => (
                   <div key={index} className="flex justify-between items-center">
                     <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                     <Button 
                       type="button" 
                       variant="ghost" 
                       size="sm" 
                       onClick={() => removeFile(index)}
                       disabled={loading}
                       className="text-destructive hover:text-destructive/80 h-auto p-0"
                     >
                       &times;
                     </Button>
                   </div>
                 ))}
               </div>
             )}
           </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewRequestModal;