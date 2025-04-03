import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // No longer needed for now
import { UserPlus, Trash2, Edit } from 'lucide-react';
import TenantForm from '../property/TenantForm';
import toast from 'react-hot-toast';
// import { Property, TenantCreate } from '@/api/types'; // TenantCreate no longer needed here
import { Property } from '@/api/types';
import { api } from '@/api/apiClient'; 
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// type TenantFormDataFromForm = Parameters<React.ComponentProps<typeof TenantForm>['onSubmit']>[0]; // No longer needed here

interface PropertyTableProps {
  properties: Property[];
  onUpdate: () => void;
}

export default function PropertyTable({ properties, onUpdate }: PropertyTableProps) {
  // const navigate = useNavigate(); // Removed
  const [showTenantForm, setShowTenantForm] = useState<string | null>(null); // Holds propertyId when modal is open
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  // const [submittingTenant, setSubmittingTenant] = useState(false); // Removed

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property?')) {
      return;
    }
    setLoadingDelete(propertyId);
    try {
        await api.property.deleteProperty(propertyId);
        toast.success('Property deleted successfully');
        onUpdate(); 
    } catch (error) {
        console.error("Error deleting property:", error);
        toast.error('Failed to delete property');
    } finally {
        setLoadingDelete(null);
    }
  };

  const handleEditProperty = () => { // Removed unused propertyId
    toast('Edit functionality is not yet implemented.'); 
  };

  // handleTenantSubmit function is removed

  return (
    <>
      <div className="border rounded-md">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Property Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {properties.length === 0 ? (
                <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                    No properties found.
                </TableCell>
                </TableRow>
            ) : (
                properties.map((property) => (
                <TableRow key={property.id}>
                    <TableCell className="font-medium">{property.property_name}</TableCell>
                    <TableCell>{property.property_type}</TableCell>
                    <TableCell>{`${property.city}, ${property.state}`}</TableCell>
                    <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-1">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowTenantForm(property.id)} // Sets propertyId in state
                        title="Add Tenant"
                        className="h-8 w-8 p-0"
                        >
                        <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditProperty()} // Call without propertyId
                        title="Edit Property"
                        className="h-8 w-8 p-0"
                        >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteProperty(property.id)}
                        disabled={loadingDelete === property.id}
                        title="Delete Property"
                        className="h-8 w-8 p-0"
                    >
                        {loadingDelete === property.id ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Trash2 className="h-4 w-4" />}
                    </Button>
                    </TableCell>
                </TableRow>
                ))
            )}
            </TableBody>
        </Table>
      </div>

      {showTenantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <TenantForm 
              propertyId={showTenantForm} // Pass the propertyId directly
              onSubmit={() => {       // onSubmit refreshes data and closes modal
                setShowTenantForm(null);
                onUpdate();
              }} 
              onCancel={() => setShowTenantForm(null)} // onCancel just closes modal
              // isSubmitting prop is likely handled internally by this TenantForm
            />
          </div>
        </div>
      )}
    </>
  );
}
