import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, Star } from 'lucide-react';
import { usePropertiesApi } from '../hooks/usePropertiesApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import NewRequestModal from '../components/maintenance/NewRequestModal';
import RecordPaymentModal from '../components/payment/RecordPaymentModal';
import PropertyForm from '../components/property/PropertyForm';
import PropertyMap from '../components/property/PropertyMap';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { getDocuments, deleteDocument } from '../api/services/documentService';
import { useAuth } from '../contexts/AuthContext';
import DocumentUploadForm from '../components/documents/DocumentUploadForm';
import { Loader2, FileText, Trash2, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Document } from '../types/document';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
} from "@/components/ui/dialog";

// Define extended property type to handle new API properties
interface EnhancedProperty {
  id: string;
  property_name: string;
  property_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode?: string;
  zip_code?: string; // Provided by the API
  image_url?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  size_sqft?: number;
  year_built?: number;
  tenants?: unknown[];
  amenities?: string[];
  number_of_units?: number;
}

// Component specifically for tenant documents on this page
function TenantPropertyDocuments({ propertyId, tenantId }: { propertyId: string, tenantId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const fetchTenantPropertyDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDocuments({ property_id: propertyId, tenant_id: tenantId });
      setDocuments(response.documents || []);
    } catch (err) {
      console.error("Error fetching tenant-property documents:", err);
      setError('Failed to load your documents for this property.');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId && tenantId) {
        fetchTenantPropertyDocuments();
    } else {
        setDocuments([]);
    }
  }, [propertyId, tenantId]);

  const handleUploadSuccess = (newDocument: Document) => {
    setDocuments((prevDocs) => [...prevDocs, newDocument]);
    setIsUploadDialogOpen(false);
    toast.success('Document uploaded successfully!');
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }
    setDeletingId(documentId);
    const toastId = toast.loading('Deleting document...');
    try {
      await deleteDocument(documentId);
      setDocuments(docs => docs.filter(d => d.id !== documentId));
      toast.success('Document deleted successfully', { id: toastId });
    } catch (err: unknown) {
      console.error("Error deleting document:", err);
      let message = 'Failed to delete document.';
      if (err instanceof Error) message = err.message;
      toast.error(message, { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-10 p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex justify-between items-center mb-4">
          <div>
             <h2 className="text-xl font-semibold">My Documents for this Property</h2>
             <p className="text-sm text-muted-foreground">
                Manage your receipts, agreements, etc. for this property.
             </p>
          </div>
         <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
             <DialogTrigger asChild>
                 <Button size="sm">
                     <UploadCloud className="mr-2 h-4 w-4" />
                     Upload New
                 </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[600px]">
                 <DialogHeader>
                     <DialogTitle>Upload New Document</DialogTitle>
                 </DialogHeader>
                 <DocumentUploadForm 
                     propertyId={propertyId} 
                     tenantId={tenantId} 
                     onUploadSuccess={handleUploadSuccess} 
                     onCancel={() => setIsUploadDialogOpen(false)}
                 />
             </DialogContent>
         </Dialog>
      </div>
      
      <div className="space-y-3 mb-6">
        <h4 className="font-medium text-base">Uploaded Documents</h4>
        {isLoading && <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</div>}
        {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {!isLoading && !error && documents.length === 0 && <p className="text-sm text-muted-foreground italic">You haven't uploaded any documents for this property yet.</p>}
        {!isLoading && !error && documents.length > 0 && (
          <ul className="space-y-2 list-none p-0">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between p-2 border rounded-md bg-background text-sm">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title={doc.description || doc.document_name} className="truncate hover:underline text-foreground">
                    {doc.document_name}
                  </a>
                  {doc.document_type && <span className="text-xs text-muted-foreground flex-shrink-0">({doc.document_type.replace(/_/g, ' ')})</span>}
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80 h-7 px-2 disabled:opacity-50" onClick={() => handleDeleteDocument(doc.id)} title="Delete Document" disabled={deletingId === doc.id}>
                  {deletingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tenantId = user?.id;
  const [selectedImage, setSelectedImage] = useState(0);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const { properties, loading: propertiesLoading, error: propertiesError } = usePropertiesApi();
  const property = id ? properties.find(p => p.id === id) as EnhancedProperty | undefined : undefined;

  useEffect(() => {
    if (!propertiesLoading && !property && id) {
      toast.error('Property not found');
      navigate('/dashboard');
    }
  }, [property, propertiesLoading, id, navigate]);

  if (propertiesLoading) return <LoadingSpinner />;
  if (propertiesError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>Error loading property details: {propertiesError}</p>
          <button onClick={() => navigate('/dashboard')} className="underline mt-2">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  if (!property) return null;

  const propertyId = property.id;

  const images = property?.image_url 
    ? [property.image_url]
    : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"];

  const fullAddress = [
    property.address_line1,
    property.address_line2,
    property.city,
    property.state,
    property.pincode || property.zip_code
  ].filter(Boolean).join(', ');

  // Prepare initialData for PropertyForm - only compute if property exists
  const propertyFormDataForEdit = property ? {
      id: property.id,
      propertyName: property.property_name,
      propertyType: property.property_type,
      addressLine1: property.address_line1,
      addressLine2: property.address_line2,
      city: property.city,
      state: property.state,
      pincode: property.pincode,
      description: property.description,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sizeSqft: property.size_sqft,
      yearBuilt: property.year_built,
      amenities: property.amenities,
      numberOfUnits: property.number_of_units,
      image_urls: property.image_url ? [property.image_url] : [], 
      image_paths: [], 
      // --- Fields required by PropertyFormData but potentially missing in EnhancedProperty ---
      // Provide defaults or map from EnhancedProperty if available
      category: '', // Example default
      listedIn: '', // Example default
      price: 0,      // Example default
      yearlyTaxRate: 0, // Example default
      kitchens: 0,   // Example default
      garages: 0,    // Example default
      garageSize: 0, // Example default
      floors: 0,     // Example default
      document: null,// Required by PropertyFormData
      units: [],     // Required by PropertyFormData
      surveyNumber: '', // Example default
      doorNumber: '',   // Example default
  } : undefined;

  // Function to handle successful property update from the form
  const handlePropertyUpdate = async (/* updatedData: TBD */) => { // Parameter type might be needed depending on onSubmit signature in PropertyForm
      setShowEditModal(false);
      toast.success("Property updated successfully!");
      // TODO: Ideally, update the local properties state via a callback from usePropertiesApi or refetch
      // navigate(0); // Avoid full page reload
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-black">
          <ArrowLeft size={20} className="mr-2" />
          Back to Dashboard
        </button>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowEditModal(true)}
            className="flex items-center space-x-2 text-gray-600 hover:text-black"
          >
            <Star size={20} />
            <span>Edit Property</span>
          </button>
          <button className="flex items-center space-x-2 text-gray-600 hover:text-black">
            <Share2 size={20} />
            <span>Share</span>
          </button>
          <button 
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center space-x-2 ${isSaved ? 'text-red-500' : 'text-gray-600 hover:text-black'}`}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="col-span-2 row-span-2 relative">
          <img
            src={images[selectedImage]}
            alt={property.property_name}
            className="w-full h-full object-cover rounded-lg"
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {selectedImage + 1} / {images.length}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 col-span-2">
          {images.slice(1, 5).map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`${property.property_name} ${index + 2}`}
              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(index + 1)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-12">
        <div className="col-span-2">
          {/* Property Title & Location */}
          <div className="border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">{property.property_name}</h1>
            <div className="flex items-center text-gray-600">
              <MapPin size={18} className="mr-2" />
              <span>{fullAddress}</span>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {property.bedrooms && (
              <div>
                <h3 className="font-semibold">Bedrooms</h3>
                <p>{property.bedrooms}</p>
              </div>
            )}
            {property.bathrooms && (
              <div>
                <h3 className="font-semibold">Bathrooms</h3>
                <p>{property.bathrooms}</p>
              </div>
            )}
            {property.size_sqft && (
              <div>
                <h3 className="font-semibold">Area</h3>
                <p>{property.size_sqft} sq.ft</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">About this property</h2>
            <p className="text-gray-600 whitespace-pre-line">{property.description}</p>
          </div>

          {/* Amenities */}
          {property.amenities && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
              <div className="grid grid-cols-2 gap-4">
                {property.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-black rounded-full" />
                    <span className="capitalize">{amenity.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Location</h2>
            {property && fullAddress && (
              <PropertyMap 
                address={fullAddress}
                className="h-[400px] rounded-lg overflow-hidden"
              />
            )}
          </div>

          {/* Tenants Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Current Tenants</h2>
            {/* <TenantList 
              property={property}
            /> */}
          </div>
          
          {/* Tenant Documents Section - Ensure correct placement */}
          {tenantId && propertyId && (
              <TenantPropertyDocuments propertyId={propertyId} tenantId={tenantId} />
          )}

        </div> {/* End of col-span-2 */} 

        {/* Sidebar */}
        <aside className="col-span-1">
           {/* ... sidebar content ... */} 
        </aside>
      </div>

      {/* Modals */}
      {showMaintenanceModal && (
        <NewRequestModal
          onClose={() => setShowMaintenanceModal(false)}
          onSubmitSuccess={() => { /* Optional: Add logic like refetching requests */ }}
        />
      )}

      {showPaymentModal && property && (
        <RecordPaymentModal
          propertyId={property.id}
          onClose={() => setShowPaymentModal(false)}
          onSubmitSuccess={() => { /* Optional: Add logic like refetching payments */ }}
        />
      )}

      {showEditModal && propertyFormDataForEdit && (
        <PropertyForm 
          initialData={propertyFormDataForEdit}
          onCancel={() => setShowEditModal(false)} 
          onSubmit={handlePropertyUpdate} 
        />
      )}
    </div>
  );
}
