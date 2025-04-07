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
    console.log("[handlePropertyFormSubmit] Starting submission..."); // Log entry
    toast.loading(propertyDialogInitialData ? 'Updating property...' : 'Adding property...');
    let submissionError = null;
    try {
      let uploadedImageUrls: string[] | undefined = undefined; 
      console.log(`[handlePropertyFormSubmit] Found ${images?.length || 0} image(s) to upload.`); // Log image count
      if (images && images.length > 0) {
          try {
              console.log("[handlePropertyFormSubmit] Attempting image upload...");
              const uploadResponse = await api.property.uploadPropertyImages(images);
              console.log("[handlePropertyFormSubmit] Image upload API call finished.");
              if (uploadResponse && uploadResponse.imageUrls && uploadResponse.imageUrls.length > 0) {
                  uploadedImageUrls = uploadResponse.imageUrls;
                  console.log("[handlePropertyFormSubmit] Image upload successful. URLs:", uploadedImageUrls);
              } else {
                   console.warn("[handlePropertyFormSubmit] Image upload response missing expected data:", uploadResponse);
              }
          } catch (uploadError) {
              console.error('[handlePropertyFormSubmit] Image upload failed:', uploadError);
              toast.error('Image upload failed. Property saved without image(s).');
              // Clear the URLs if upload failed to prevent potential reuse
              uploadedImageUrls = undefined; 
          }
      }

      if (propertyDialogInitialData && propertyDialogInitialData.id) {
        console.log("[handlePropertyFormSubmit] Proceeding with UPDATE logic (Placeholder). ID:", propertyDialogInitialData.id); // Log update path
        // --- UPDATE LOGIC (Still Placeholder) ---
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
            // Add image_urls if the array exists and has URLs
            ...(uploadedImageUrls && uploadedImageUrls.length > 0 && { image_urls: uploadedImageUrls })
         };
        console.info("[handlePropertyFormSubmit] Update Property Payload (Placeholder):", updatePayload);
        toast.success('Property updated successfully! (Simulation)');
        // Example: await api.property.updateProperty(propertyDialogInitialData.id, updatePayload);

      } else {
        console.log("[handlePropertyFormSubmit] Proceeding with CREATE logic."); // Log create path
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
            // Add image_urls if the array exists and has URLs
            ...(uploadedImageUrls && uploadedImageUrls.length > 0 && { image_urls: uploadedImageUrls })
        };
        
        console.log("[handlePropertyFormSubmit] Payload constructed:", JSON.stringify(createPayload, null, 2)); // Log constructed payload
        
        console.log("[handlePropertyFormSubmit] Calling createProperty API...");
        await api.property.createProperty(createPayload); 
        console.log("[handlePropertyFormSubmit] createProperty API call finished.");
        
        toast.success('Property added successfully!');
      }
      
      if (onSuccessCallback) {
        console.log("[handlePropertyFormSubmit] Executing success callback...");
        try {
            await onSuccessCallback();
        } catch (callbackError) {
            console.error("[handlePropertyFormSubmit] Error executing success callback:", callbackError);
            toast.error("Action succeeded, but failed to refresh data.");
        }
      }
      console.log("[handlePropertyFormSubmit] Submission try block finished.");
      
    } catch (error) {
        submissionError = error;
        // Log the specific error caught during property save/creation
        console.error("[handlePropertyFormSubmit] Error during property save/create API call or payload construction:", error); 
        toast.error('Failed to save property.');
    } finally {
        toast.dismiss();
        console.log(`[handlePropertyFormSubmit] Finally block. Submission error: ${!!submissionError}`);
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
