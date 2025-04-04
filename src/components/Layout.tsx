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
      let imageUrl = undefined;
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
        console.log("Update Property (Not Implemented):", formData, imageUrl);
        toast.success('Property updated successfully! (Simulation)');
      } else {
        console.log("Create Property (Not Implemented):", formData, imageUrl);
        toast.success('Property added successfully! (Simulation)');
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
      
      <div className="flex">
        {user && (
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}

        <main className={`flex-1 transition-all duration-300 ease-in-out ${user ? (sidebarOpen ? 'ml-64' : 'ml-16') : 'ml-0'} pt-16`}>
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
