import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Camera, FileText, Upload, Save, X } from 'lucide-react';
import { Tenant, TenantUpdate } from '../../api/types';
import * as tenantService from '../../api/services/tenantService';
import * as uploadService from '../../api/services/uploadService';
import * as documentService from '../../api/services/documentService';
import apiClient from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';

import { useAuth } from '@/contexts/AuthContext';

interface TenantEditFormData {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  profile_photo_url: string;
  monthly_income: string;
  employer_name: string;
  occupation: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  verification_notes: string;
}

export default function TenantEditPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  
  const [formData, setFormData] = useState<TenantEditFormData>({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    profile_photo_url: '',
    monthly_income: '',
    employer_name: '',
    occupation: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    verification_notes: ''
  });

  useEffect(() => {
    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tenantService.getTenantById(tenantId!);
      setTenant(response.tenant);
      
      // Populate form data
      const tenantData = response.tenant;
      const tenantUnknown = tenantData as unknown as Record<string, string>;
      setFormData({
        name: tenantData.name || '',
        email: tenantData.email || '',
        phone: tenantData.phone || '',
        date_of_birth: tenantData.date_of_birth || tenantUnknown.dob || '',
        gender: tenantData.gender || '',
        profile_photo_url: tenantUnknown.profile_photo_url || '',
        monthly_income: tenantUnknown.monthly_income || '',
        employer_name: tenantUnknown.employer_name || '',
        occupation: tenantUnknown.occupation || '',
        emergency_contact_name: tenantUnknown.emergency_contact_name || '',
        emergency_contact_phone: tenantUnknown.emergency_contact_phone || '',
        emergency_contact_relationship: tenantUnknown.emergency_contact_relationship || '',
        address_line1: tenantUnknown.address_line1 || '',
        address_line2: tenantUnknown.address_line2 || '',
        city: tenantUnknown.city || '',
        state: tenantUnknown.state || '',
        pincode: tenantUnknown.pincode || '',
        verification_notes: tenantUnknown.verification_notes || ''
      });
    } catch (error) {
      console.error('Error fetching tenant:', error);
      setError('Failed to fetch tenant data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TenantEditFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo must be less than 10MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadService.uploadFile(file, 'tenant_photos', user.id);
      setFormData(prev => ({
        ...prev,
        profile_photo_url: photoUrl
      }));
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !tenant) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Document must be less than 50MB');
      return;
    }

    // Get property_id from tenant object
    const propertyId = tenant.property_id || tenant.current_property?.id;
    if (!propertyId) {
      toast.error('Cannot upload document: No property associated with this tenant');
      return;
    }

    setUploadingDocument(true);
    try {
      // Use direct API call with property_id metadata
      const formData = new FormData();
      formData.append('files', file);
      formData.append('context', 'tenant_documents');
      formData.append('related_id', user.id);
      formData.append('property_id', propertyId);

      const response = await apiClient.post('/uploads/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success) {
        const documentUrl = response.data.image_urls?.[0] || response.data.file_url;
        if (documentUrl) {
          console.log('Document uploaded to storage:', documentUrl);
          
          // Create document record after successful upload
          try {
            await documentService.createDocument({
              document_name: file.name,
              file_url: documentUrl,
              property_id: propertyId,
              tenant_id: tenantId!,
              document_type: 'other',
              mime_type: file.type,
              file_size: file.size,
              title: file.name,
              file_name: file.name,
              access_level: 'private'
            });
            console.log('Document record created successfully');
          } catch (docError) {
            console.warn('Document uploaded but failed to create record:', docError);
            // Don't throw error here - the file was still uploaded successfully
          }
          
          toast.success('Document uploaded successfully');
        } else {
          throw new Error('Upload succeeded but no file URL was returned');
        }
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      let errorMessage = 'Failed to upload document';
      
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'detail' in error.response.data) {
        errorMessage = (error.response.data as { detail: string }).detail;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const updateData: TenantUpdate = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender as any,
        profile_photo_url: formData.profile_photo_url,
        monthly_income: formData.monthly_income ? parseInt(formData.monthly_income) : undefined,
        employer_name: formData.employer_name,
        occupation: formData.occupation,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        verification_notes: formData.verification_notes
      };

      await tenantService.updateTenant(tenantId!, updateData);
      toast.success('Tenant updated successfully');
      navigate(`/dashboard/tenants/${tenantId}`);
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(`/dashboard/tenants/${tenantId}`);
  };

  const handleCancel = () => {
    navigate(`/dashboard/tenants/${tenantId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <button 
              onClick={fetchTenant}
              className="mt-2 text-sm underline block"
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Tenant Not Found</AlertTitle>
          <AlertDescription>
            The tenant you're looking for doesn't exist or you don't have permission to view it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-wide">Edit Tenant Profile</h1>
              <p className="text-gray-600">Update {tenant.name}'s information</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Photo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Profile Photo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {formData.profile_photo_url ? (
                    <img 
                      src={formData.profile_photo_url} 
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload Photo</span>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </Label>
                <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF (max 10MB)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={formData.address_line1}
                onChange={(e) => handleInputChange('address_line1', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={formData.address_line2}
                onChange={(e) => handleInputChange('address_line2', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="employer_name">Employer Name</Label>
                <Input
                  id="employer_name"
                  value={formData.employer_name}
                  onChange={(e) => handleInputChange('employer_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="monthly_income">Monthly Income (₹)</Label>
                <Input
                  id="monthly_income"
                  type="number"
                  value={formData.monthly_income}
                  onChange={(e) => handleInputChange('monthly_income', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Document Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="document-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingDocument ? 'Uploading...' : 'Upload Document'}</span>
                </div>
                <input
                  id="document-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={uploadingDocument}
                />
              </Label>
              <p className="text-sm text-gray-500 mt-2">PDF, DOC, DOCX, JPG, PNG (max 50MB)</p>
            </div>
          </CardContent>
        </Card>

        {/* Verification Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="verification_notes">Notes</Label>
              <Textarea
                id="verification_notes"
                value={formData.verification_notes}
                onChange={(e) => handleInputChange('verification_notes', e.target.value)}
                placeholder="Add any verification notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
} 