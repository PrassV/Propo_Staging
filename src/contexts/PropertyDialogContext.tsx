import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { PropertyFormData } from '@/api/types';

// Allow initialData to potentially include an ID and existing image URLs/Paths
type InitialDataType = Partial<PropertyFormData> & { 
    id?: string;
    image_urls?: string[]; // Add existing image paths/URLs
};
type SuccessCallbackType = () => void | Promise<void>; // Callback type

// Define the shape of the context data
interface PropertyDialogContextType {
  isOpen: boolean;
  initialData: InitialDataType | null; // Use the combined type
  openDialog: (data?: InitialDataType | null, onSuccess?: SuccessCallbackType) => void; // Add onSuccess param
  closeDialog: () => void;
  triggerSubmit?: () => Promise<void>; // Optional: To trigger form submission from outside
  onSuccessCallback?: SuccessCallbackType | null; // Store the callback
}

// Create the context with a default value (or undefined if you prefer throwing errors)
const PropertyDialogContext = createContext<PropertyDialogContextType | undefined>(undefined);

// Define the props for the provider
interface PropertyDialogProviderProps {
  children: ReactNode;
}

// Create the Provider component
export const PropertyDialogProvider: React.FC<PropertyDialogProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<InitialDataType | null>(null);
  const [onSuccessCallback, setOnSuccessCallback] = useState<SuccessCallbackType | null>(null); 

  const openDialog = useCallback((data: InitialDataType | null = null, onSuccess: SuccessCallbackType | undefined = undefined) => { 
    setInitialData(data);
    // Store the callback directly (or null if undefined)
    setOnSuccessCallback(onSuccess ? () => onSuccess : null);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setInitialData(null); // Clear initial data on close
    setOnSuccessCallback(null); // Clear callback on close
  }, []);

  // The value provided to consuming components
  const value = {
    isOpen,
    initialData,
    openDialog,
    closeDialog,
    onSuccessCallback, // Provide callback to context consumers (e.g., Layout)
  };

  return (
    <PropertyDialogContext.Provider value={value}>
      {children}
    </PropertyDialogContext.Provider>
  );
};

// Create a custom hook for easy consumption
export const usePropertyDialog = (): PropertyDialogContextType => {
  const context = useContext(PropertyDialogContext);
  if (context === undefined) {
    throw new Error('usePropertyDialog must be used within a PropertyDialogProvider');
  }
  return context;
}; 