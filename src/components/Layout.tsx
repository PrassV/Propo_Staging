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
    console.log("[handlePropertyFormSubmit] Starting submission...");
    toast.loading(propertyDialogInitialData ? 'Updating property...' : 'Adding property...');
    let submissionError = null;
    try {
      let uploadedImagePaths: string[] = []; // Initialize as empty array, will store paths
      console.log(`[handlePropertyFormSubmit] Found ${images?.length || 0} image(s) to upload.`);
      if (images && images.length > 0) {
          try {
              console.log("[handlePropertyFormSubmit] Attempting image upload...");
              // Call the updated function, expect imagePaths back
              const uploadResponse = await api.property.uploadPropertyImages(images);
              console.log("[handlePropertyFormSubmit] Image upload API call finished.");
              // Use the returned imagePaths
              if (uploadResponse && uploadResponse.imagePaths && uploadResponse.imagePaths.length > 0) {
                  uploadedImagePaths = uploadResponse.imagePaths;
                  console.log("[handlePropertyFormSubmit] Image upload successful. Paths:", uploadedImagePaths);
              } else {
                   console.warn("[handlePropertyFormSubmit] Image upload response missing expected path data:", uploadResponse);
                   // Decide if we should proceed without images or throw an error
                   // For now, we let it proceed but the paths array will be empty.
              }
          } catch (uploadError) {
              console.error('[handlePropertyFormSubmit] Image upload failed:', uploadError);
              // Don't proceed with property save if image upload was intended but failed?
              // Or save without images? Current logic: Save without images.
              toast.error('Image upload failed. Property saved without new image(s).'); 
              uploadedImagePaths = []; // Ensure paths are empty if upload fails
          }
      }

      const propertyId = propertyDialogInitialData?.id;
      // Combine existing image paths (if any) with new ones
      // Now accessing image_urls which exists on the updated InitialDataType
      const existingImagePaths = propertyDialogInitialData?.image_urls || []; 
      const finalImagePaths = [...existingImagePaths, ...uploadedImagePaths];

      if (!propertyId) {
        // --- CREATE LOGIC ---
        if (!user) {
          toast.error("You must be logged in to create a property.");
          toast.dismiss(); // Dismiss loading toast
          return;
        }

        const createPayload = {
          owner_id: user.id,
          property_name: formData.propertyName,
          property_type: formData.propertyType,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2 || undefined,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
          description: formData.description || undefined,
          number_of_units: formData.numberOfUnits,
          category: formData.category || undefined,
          listed_in: formData.listedIn || undefined,
          price: formData.price,
          yearly_tax_rate: formData.yearlyTaxRate,
          size_sqft: formData.sizeSqft,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          kitchens: formData.kitchens,
          garages: formData.garages,
          garage_size: formData.garageSize,
          year_built: formData.yearBuilt,
          floors: formData.floors,
          amenities: formData.amenities || [],
          survey_number: formData.surveyNumber || undefined,
          door_number: formData.doorNumber || undefined,
          status: formData.status || undefined,
          // Use the collected paths here
          image_urls: finalImagePaths, // Store paths in image_urls field
        };
        
        console.log("[handlePropertyFormSubmit] Create Payload with image paths:", JSON.stringify(createPayload, null, 2));
        
        console.log("[handlePropertyFormSubmit] Calling createProperty API...");
        await api.property.createProperty(createPayload); 
        console.log("[handlePropertyFormSubmit] createProperty API call finished.");
        
        toast.success('Property added successfully!');
      } else {
        // --- UPDATE LOGIC ---
        // TODO: Fully implement the update logic, including fetching existing images if needed
        // The current initialData might not have the full image list depending on how it's populated.
        // For now, just using the paths from the dialog's initial data + new uploads.
        const updatePayload = {
          property_name: formData.propertyName,
          property_type: formData.propertyType,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2 || undefined,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
          description: formData.description || undefined,
          number_of_units: formData.numberOfUnits,
          category: formData.category || undefined,
          listed_in: formData.listedIn || undefined,
          price: formData.price,
          yearly_tax_rate: formData.yearlyTaxRate,
          size_sqft: formData.sizeSqft,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          kitchens: formData.kitchens,
          garages: formData.garages,
          garage_size: formData.garageSize,
          year_built: formData.yearBuilt,
          floors: formData.floors,
          amenities: formData.amenities || [],
          survey_number: formData.surveyNumber || undefined,
          door_number: formData.doorNumber || undefined,
          status: formData.status || undefined,
          // Use the combined paths here as well
          image_urls: finalImagePaths, // Store paths in image_urls field
        };
        
        console.log("[handlePropertyFormSubmit] Update Payload with image paths:", JSON.stringify(updatePayload, null, 2));
        // TODO: Uncomment and implement actual update API call
        // await api.property.updateProperty(propertyId, updatePayload);
        console.log("Simulating update property API call...");
        toast.success('Property updated successfully! (Simulation)');
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
        console.error("[handlePropertyFormSubmit] Error during property save/create API call or payload construction:", error); 
        toast.error('Failed to save property details.'); // More specific error message
    } finally {
        toast.dismiss(); // Dismiss loading toast
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
