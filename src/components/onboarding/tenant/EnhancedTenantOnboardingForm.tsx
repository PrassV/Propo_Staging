import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useInvitationData } from '../../../hooks/useInvitationData';
import { clearInvitationToken } from '../../../utils/token';
import toast from 'react-hot-toast';
import { TenantFormData } from '../../../types/tenant';
import { uploadFile } from '../../../api/services/uploadService';
import { createTenant } from '../../../api/services/tenantService';
import { formatINR } from '../../../utils';
import { Upload, Camera, FileText, User, MapPin, Briefcase, Heart, Shield } from 'lucide-react';
import InputField from '../../auth/InputField';

interface EnhancedTenantFormData extends TenantFormData {
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profilePhoto: File | null;
  monthlyIncome: string;
  employerName: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  bankStatement: File | null;
  additionalDocuments: File[];
}

export default function EnhancedTenantOnboardingForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invitationData } = useInvitationData();
  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  
  const [formData, setFormData] = useState<EnhancedTenantFormData>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    familySize: '1',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    idType: 'aadhaar',
    idNumber: '',
    idProof: null,
    // Enhanced fields
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    profilePhoto: null,
    monthlyIncome: '',
    employerName: '',
    occupation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    bankStatement: null,
    additionalDocuments: []
  });

  const sections = [
    { id: 'basic', title: 'Basic Information', icon: User },
    { id: 'personal', title: 'Personal Details', icon: Camera },
    { id: 'address', title: 'Address', icon: MapPin },
    { id: 'occupation', title: 'Occupation & Income', icon: Briefcase },
    { id: 'emergency', title: 'Emergency Contact', icon: Heart },
    { id: 'documents', title: 'Documents', icon: FileText },
    { id: 'verification', title: 'ID Verification', icon: Shield }
  ];

  // Pre-fill form with invitation data
  useEffect(() => {
    if (invitationData?.tenant) {
      const tenant = invitationData.tenant;
      setFormData((prev) => ({
        ...prev,
        firstName: tenant.first_name || tenant.name?.split(' ')[0] || '',
        lastName: tenant.last_name || tenant.name?.split(' ').slice(1).join(' ') || '',
        email: tenant.email || prev.email,
        phone: tenant.phone_number || tenant.phone || ''
      }));
    }
  }, [invitationData]);

  // Pre-populate from user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: prev.firstName || user.first_name || '',
        lastName: prev.lastName || user.last_name || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const uploadedFiles: Record<string, string> = {};
      
      // Get property_id from invitation data if available
      const propertyId = invitationData?.property?.id;
      
      // Determine upload context and metadata based on property availability
      const documentContext = propertyId ? 'tenant_documents' : 'id_documents';
      const uploadMetadata = propertyId ? { property_id: propertyId } : undefined;

      // Upload profile photo (tenant_photos doesn't require property_id)
      if (formData.profilePhoto) {
        uploadedFiles.profilePhotoUrl = await uploadFile(
          formData.profilePhoto,
          'tenant_photos',
          user.id
        );
      }

      // Upload ID proof
      if (formData.idProof) {
        uploadedFiles.idProofUrl = await uploadFile(
          formData.idProof,
          documentContext,
          user.id,
          uploadMetadata
        );
      }

      // Upload bank statement
      if (formData.bankStatement) {
        uploadedFiles.bankStatementUrl = await uploadFile(
          formData.bankStatement,
          documentContext,
          user.id,
          uploadMetadata
        );
      }

      // Create tenant data
      const tenantData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        family_size: parseInt(formData.familySize) || 1,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        profile_photo_url: uploadedFiles.profilePhotoUrl || null,
        permanent_address: `${formData.addressLine1}, ${formData.addressLine2 ? formData.addressLine2 + ', ' : ''}${formData.city}, ${formData.state} ${formData.pincode}`,
        occupation: formData.occupation,
        monthly_income: parseFloat(formData.monthlyIncome) || 0,
        employer_name: formData.employerName,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relationship: formData.emergencyContactRelationship,
        id_type: formData.idType,
        id_number: formData.idNumber,
        id_proof_url: uploadedFiles.idProofUrl || null,
        bank_statement_url: uploadedFiles.bankStatementUrl || null,
        verification_status: 'pending',
        status: 'unassigned' as const,
        preferred_contact_method: 'email',
        property_id: propertyId || undefined
      };

      await createTenant(tenantData);

      if (invitationData) {
        clearInvitationToken();
      }

      toast.success('Enhanced profile created successfully! Your information is being verified.');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating tenant profile:', error);
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="First Name"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                disabled={loading}
              />
              <InputField
                label="Last Name"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <InputField
              label="Email"
              type="email"
              value={formData.email}
              disabled={true}
              onChange={() => {}}
            />
            <InputField
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Family Size"
              type="number"
              min="1"
              value={formData.familySize}
              onChange={(e) => setFormData({ ...formData, familySize: e.target.value })}
              required
              disabled={loading}
            />
          </div>
        );

      case 1: // Personal Details
        return (
          <div className="space-y-6">
            <InputField
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
              disabled={loading}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
                disabled={loading}
              >
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.files?.[0] || null })}
                  className="hidden"
                  id="profile-photo"
                  disabled={loading}
                />
                <label htmlFor="profile-photo" className="cursor-pointer">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <span className="mt-2 block text-sm text-gray-600">
                    Click to upload profile photo
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      case 2: // Address
        return (
          <div className="space-y-6">
            <InputField
              label="Address Line 1"
              type="text"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Address Line 2"
              type="text"
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              disabled={loading}
            />
            <div className="grid grid-cols-3 gap-4">
              <InputField
                label="City"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                disabled={loading}
              />
              <InputField
                label="State"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
                disabled={loading}
              />
              <InputField
                label="Pincode"
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>
        );

      case 3: // Occupation & Income
        return (
          <div className="space-y-6">
            <InputField
              label="Occupation"
              type="text"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Employer Name"
              type="text"
              value={formData.employerName}
              onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Monthly Income (₹)"
              type="number"
              min="0"
              value={formData.monthlyIncome}
              onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
              required
              disabled={loading}
            />
            {formData.monthlyIncome && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Monthly Income: {formatINR(parseFloat(formData.monthlyIncome) || 0)}
                </p>
              </div>
            )}
          </div>
        );

      case 4: // Emergency Contact
        return (
          <div className="space-y-6">
            <InputField
              label="Emergency Contact Name"
              type="text"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Emergency Contact Phone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              required
              disabled={loading}
            />
            <InputField
              label="Relationship"
              type="text"
              value={formData.emergencyContactRelationship}
              onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
              required
              disabled={loading}
            />
          </div>
        );

      case 5: // Documents
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Statement</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormData({ ...formData, bankStatement: e.target.files?.[0] || null })}
                  className="hidden"
                  id="bank-statement"
                  disabled={loading}
                />
                <label htmlFor="bank-statement" className="cursor-pointer">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <span className="mt-2 block text-sm text-gray-600">
                    Click to upload bank statement
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      case 6: // ID Verification
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-black"
                required
                disabled={loading}
              >
                <option value="aadhaar">Aadhaar Card</option>
                <option value="pan_card">PAN Card</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
              </select>
            </div>
            <InputField
              label="ID Number"
              type="text"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              required
              disabled={loading}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload ID Proof</label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFormData({ ...formData, idProof: e.target.files?.[0] || null })}
                  className="hidden"
                  id="id-proof"
                  required
                  disabled={loading}
                />
                <label htmlFor="id-proof" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <span className="mt-2 block text-sm text-gray-600">
                    Click to upload your ID proof
                  </span>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8 my-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-wide">Complete Your Enhanced Profile</h1>
        <p className="text-gray-600 mb-6">
          Please provide comprehensive information to help landlords make informed decisions.
        </p>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={section.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  index === currentSection 
                    ? 'bg-black text-white' 
                    : index < currentSection 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  <Icon size={16} />
                </div>
                {index < sections.length - 1 && (
                  <div className={`w-12 h-0.5 ${
                    index < currentSection ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">{sections[currentSection].title}</h2>
            <p className="text-gray-600">Step {currentSection + 1} of {sections.length}</p>
          </div>
          
          {renderSection()}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
            disabled={currentSection === 0 || loading}
            className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>

          {currentSection < sections.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentSection(prev => Math.min(sections.length - 1, prev + 1))}
              disabled={loading}
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating Profile...' : 'Complete Enhanced Profile'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 