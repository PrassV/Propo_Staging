import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { usePropertyDialog } from '../contexts/PropertyDialogContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PropertyForm from './property/PropertyForm';
import api from '@/api';
import toast from 'react-hot-toast';
import { PropertyFormData } from '@/api/types';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    isOpen: isPropertyDialogOpen,
    initialData: propertyDialogInitialData,
    closeDialog: closePropertyDialog,
    onSuccessCallback,
  } = usePropertyDialog();
  
  // Don't show layout on auth pages and landing page
  const isAuthPage = location.pathname.startsWith('/invite/');
  const isLandingPage = location.pathname === '/';
  if (isAuthPage || (isLandingPage && !user)) {
    return <>{children}</>; 
  }

  // Handler for PropertyForm submission within the Dialog
  const handlePropertyFormSubmit = async (
      formData: PropertyFormData,
      images: File[]
  ): Promise<void> => {
    toast.loading(propertyDialogInitialData ? 'Updating property...' : 'Adding property...');
    let submissionError = null;
    try {
      let imageUrl: string | undefined = undefined;
      if (images && images.length > 0) {
          try {
              const uploadResponse = await api.property.uploadPropertyImages(images);
              if (uploadResponse && uploadResponse.imageUrls && uploadResponse.imageUrls.length > 0) {
                  imageUrl = uploadResponse.imageUrls[0];
              }
          } catch (uploadError) {
              console.error('Image upload failed:', uploadError);
              toast.error('Image upload failed. Property saved without image.');
          }
      }

      if (propertyDialogInitialData && propertyDialogInitialData.id) {
        // --- UPDATE LOGIC (Still Placeholder) ---
        // TODO: Implement mapping and actual API call for updating property
        const updatePayload = { 
            // Map fields from formData to backend model (snake_case)
            property_name: formData.propertyName, 
            property_type: formData.propertyType,
            address_line1: formData.addressLine1,
            address_line2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: formData.country,
            description: formData.description,
            number_of_units: formData.numberOfUnits,
            amenities: formData.amenities,
            size_sqft: formData.sizeSqft,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            kitchens: formData.kitchens,
            garages: formData.garages,
            garage_size: formData.garageSize,
            year_built: formData.yearBuilt,
            floors: formData.floors,
            listed_in: formData.listedIn,
            price: formData.price,
            yearly_tax_rate: formData.yearlyTaxRate,
            survey_number: formData.surveyNumber,
            door_number: formData.doorNumber,
            // Add image_urls if imageUrl exists
            ...(imageUrl && { image_urls: [imageUrl] })
         };
        console.info("Update Property Payload (Placeholder):", updatePayload);
        toast.success('Property updated successfully! (Simulation)');
        // Example: await api.property.updateProperty(propertyDialogInitialData.id, updatePayload);

      } else {
        // --- CREATE LOGIC (Implementation) ---
        const createPayload = { 
            // Map fields from formData to backend model (snake_case)
            property_name: formData.propertyName, 
            property_type: formData.propertyType,
            address_line1: formData.addressLine1,
            address_line2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: formData.country,
            description: formData.description,
            number_of_units: formData.numberOfUnits,
            amenities: formData.amenities,
            size_sqft: formData.sizeSqft,
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            kitchens: formData.kitchens,
            garages: formData.garages,
            garage_size: formData.garageSize,
            year_built: formData.yearBuilt,
            floors: formData.floors,
            listed_in: formData.listedIn,
            price: formData.price,
            yearly_tax_rate: formData.yearlyTaxRate,
            survey_number: formData.surveyNumber,
            door_number: formData.doorNumber,
            // Add image_urls if imageUrl exists
            ...(imageUrl && { image_urls: [imageUrl] })
        };
        
        console.info("Calling api.property.createProperty with payload:", createPayload);
        // Actual API Call - Assuming api.property.createProperty accepts this structure
        await api.property.createProperty(createPayload); 
        
        toast.success('Property added successfully!');
      }
      
      if (onSuccessCallback) {
        try {
            await onSuccessCallback();
        } catch (callbackError) {
            console.error("Error executing success callback:", callbackError);
            toast.error("Action succeeded, but failed to refresh data.");
        }
      }
      
    } catch (error) {
        submissionError = error;
        console.error("Error saving property:", error);
        toast.error('Failed to save property.');
    } finally {
        toast.dismiss();
        if (!submissionError) {
            closePropertyDialog();
        }
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-gray-900">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Added pt-16 for fixed Navbar height */}
      <div className="flex pt-16"> 
        {/* Moved Sidebar INSIDE the flex container */}
        {user && (
            <Sidebar 
              isOpen={sidebarOpen} 
              onClose={() => setSidebarOpen(false)} 
            />
        )}

        {/* Main content area takes remaining space */}
        <main className="flex-1">
             {/* Margin logic removed - flexbox handles layout */}
          {/* Reverted padding back to p-6, pt-16 is on the container */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      <Dialog open={isPropertyDialogOpen} onOpenChange={(open) => !open && closePropertyDialog()}>
          <DialogContent className="sm:max-w-[80%] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>{propertyDialogInitialData ? 'Edit Property' : 'Add New Property'}</DialogTitle>
              </DialogHeader>
              <PropertyForm 
                  initialData={propertyDialogInitialData || undefined}
                  onSubmit={handlePropertyFormSubmit}
                  onCancel={closePropertyDialog}
              />
          </DialogContent>
      </Dialog>
    </div>
  );
}
