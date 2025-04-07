import React, { useState, useEffect } from 'react';
import { useParams, Link, /* useNavigate */ } from 'react-router-dom'; // Commented out unused navigate
import { PropertyDetails, UnitDetails, Document as ApiDocument, PropertyFormData, UnitCreate } from '@/api/types'; // Add ApiDocument, remove PropertyFormData if not used in edit flow anymore
import api from '@/api'; // Correct import path
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Plus } from 'lucide-react'; // Removed unused icons
import { usePropertyDialog } from '@/contexts/PropertyDialogContext';
import ImageGallery from '@/components/property/ImageGallery'; // Import the new component
import UnitCard from '@/components/property/UnitCard'; // Import UnitCard
import TenantInfoTab from '@/components/property/details/TenantInfoTab'; // Import the tab component
import LeaseInfoTab from '@/components/property/details/LeaseInfoTab'; // Import Lease tab
import MaintenanceListTab from '@/components/property/details/MaintenanceListTab'; // Import Maintenance tab
import PaymentListTab from '@/components/property/details/PaymentListTab'; // Import Payment tab
import DocumentList from '@/components/documents/DocumentList'; // Import DocumentList
import AddUnitForm from '@/components/property/AddUnitForm'; // Import the AddUnitForm component
// Import other potential components needed (assumed locations):
// import ImageGallery from '@/components/property/ImageGallery';
// import UnitCard from '@/components/property/UnitCard'; 
// import DocumentList from '@/components/documents/DocumentList'; 
// import AddUnitForm from '@/components/property/AddUnitForm'; // etc.

// Import Dialog components - we'll use these for the Add Unit dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PropertyDetailsPage() {
    const { id: propertyId } = useParams<{ id: string }>();
    // const navigate = useNavigate(); // Removed unused
    const [property, setProperty] = useState<PropertyDetails | null>(null);
    const [documents, setDocuments] = useState<ApiDocument[]>([]); // State for documents
    const [documentsLoading, setDocumentsLoading] = useState(true); // Loading state for documents
    const [documentsError, setDocumentsError] = useState<string | null>(null); // Error state for documents
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<UnitDetails | null>(null);
    const [addUnitDialogOpen, setAddUnitDialogOpen] = useState(false); // State for dialog visibility
    const [addingUnit, setAddingUnit] = useState(false); // Loading state for unit creation
    
    const { openDialog: openEditPropertyDialog } = usePropertyDialog();

    const fetchPropertyDetails = async () => {
        if (!propertyId) {
            setError('Property ID is missing.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Replace placeholder with actual (placeholder) API call
            const fetchedProperty = await api.property.getPropertyById(propertyId);
            setProperty(fetchedProperty);
            setSelectedUnit(fetchedProperty.units?.[0] || null); // Select first unit initially
            
            // **** Remove Placeholder Data ****
            // console.warn("Using placeholder data for PropertyDetailsPage");
            // await new Promise(resolve => setTimeout(resolve, 500)); 
            // const placeholder: PropertyDetails = { /* ... placeholder object ... */ };
            // setProperty(placeholder);
            // setSelectedUnit(placeholder.units?.[0] || null); 
            // **** End Placeholder Data Removal ****
            
        } catch (err: unknown) {
            console.error("Error fetching property details:", err);
            if (err instanceof Error && (err.message.includes('404') || err.message.includes('not found'))) {
                 setError('Property not found.');
            } else {
                setError(err instanceof Error ? err.message : 'Failed to load property details.');
            }
            setProperty(null);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Documents Function
    const fetchDocuments = async () => {
        if (!propertyId) return; // Don't fetch if no property ID
        setDocumentsLoading(true);
        setDocumentsError(null);
        try {
            const response = await api.document.getDocuments({ property_id: propertyId });
      setDocuments(response.documents || []);
    } catch (err) {
            console.error("Error fetching documents:", err);
            setDocumentsError(err instanceof Error ? err.message : 'Failed to load documents.');
      setDocuments([]);
    } finally {
            setDocumentsLoading(false);
    }
  };

  useEffect(() => {
        fetchPropertyDetails();
        fetchDocuments(); // Fetch documents when component mounts or propertyId changes
    }, [propertyId]);

    const handleEditClick = () => {
        if (!property) return;
        // Define formData type explicitly
        const formData: Partial<PropertyFormData> & { id: string } = {
      id: property.id,
      propertyName: property.property_name,
      propertyType: property.property_type,
      addressLine1: property.address_line1,
      addressLine2: property.address_line2,
      city: property.city,
      state: property.state,
            pincode: property.pincode,
            country: property.country,
      description: property.description,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
            // Convert null to undefined for sizeSqft and yearBuilt
            sizeSqft: property.area ?? undefined, 
      yearBuilt: property.year_built ?? undefined, 
            category: '', // Placeholder
            listedIn: '', // Placeholder
            status: property.status, // Assuming PropertyDetails has status
            price: 0, // Placeholder
            // Ensure all required fields from PropertyFormData are present or handle optionality
            amenities: [], // Example: Add default or existing if available
            doorNumber: '', // Example
            floors: undefined, // Example
            garageSize: undefined, // Example
            garages: undefined, // Example
            kitchens: undefined, // Example
            numberOfUnits: property.units?.length, // Example: Infer from units
            surveyNumber: '', // Example
            yearlyTaxRate: undefined, // Example
        };
        openEditPropertyDialog(formData, fetchPropertyDetails);
    };

    // Handler to add a new unit
    const handleAddUnit = async (unitData: UnitCreate) => {
        if (!propertyId) return;
        try {
            setAddingUnit(true);
            const response = await api.property.createUnit(propertyId, unitData);
            console.log('Unit created:', response);
            fetchPropertyDetails(); // Refresh property details to get the new unit
            setAddUnitDialogOpen(false); // Close the dialog
        } catch (error) {
            console.error('Error creating unit:', error);
            // Handle error (could show toast notification)
        } finally {
            setAddingUnit(false);
        }
    };

    // --- Loading / Error / Not Found States --- 
    if (loading) return <div className="p-6 flex justify-center"><LoadingSpinner /></div>;
    if (error) return (
        <div className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" asChild>
                <Link to="/dashboard/properties"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Properties</Link>
            </Button>
        </div>
    );
    if (!property) return <div className="p-6 text-center">Property data is unavailable.</div>; // Should ideally be covered by error state

    // --- Main Render --- 
    return (
        <div className="p-6 space-y-6">
            {/* Back Button & Edit Button */}
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/properties">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleEditClick}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Property
                </Button>
            </div>

            {/* Property Header & Image Gallery */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{property.property_name}</CardTitle>
                    <CardDescription>{`${property.address_line1}, ${property.city}, ${property.state}`}</CardDescription>
                </CardHeader>
                <CardContent>
                     {/* Use the ImageGallery component */}
                     <ImageGallery 
                        imageUrls={property.image_urls} 
                        propertyName={property.property_name}
                        className="mb-6" // Add margin if needed
                     />
                </CardContent>
            </Card>

            {/* Units Selection & Details Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Units List */} 
                <div className="lg:col-span-1 space-y-3"> {/* Reduced space-y */} 
                    <h2 className="text-xl font-semibold px-1">Units</h2> {/* Added padding */} 
                     <Button variant="outline" className="w-full" onClick={() => setAddUnitDialogOpen(true)}>
                         <Plus className="mr-2 h-4 w-4" /> Add Unit
                     </Button>
                    {(property?.units?.length ?? 0) === 0 && <p className="text-muted-foreground text-sm px-1">No units added yet.</p>}
                    {property?.units?.map(unit => (
                        // Use the UnitCard component
                        <UnitCard 
                            key={unit.id} 
                            unit={unit}
                            isSelected={selectedUnit?.id === unit.id}
                            onClick={() => setSelectedUnit(unit)}
            />
          ))}
      </div>

                {/* Unit Details Tabs */} 
                <div className="lg:col-span-2">
                   {selectedUnit ? (
                     <Tabs defaultValue="tenant" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-4"> {/* Adjust grid-cols based on tabs */}
                            <TabsTrigger value="tenant">Tenant</TabsTrigger>
                            <TabsTrigger value="lease">Lease</TabsTrigger>
                            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                            <TabsTrigger value="payments">Payments</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tenant">
                            <Card>
                                <CardHeader><CardTitle>Tenant Information</CardTitle></CardHeader>
                                <CardContent>
                                   {selectedUnit.status === 'Occupied' && selectedUnit.current_tenant_id ? (
                                       // Use the TenantInfoTab component
                                       <TenantInfoTab tenantId={selectedUnit.current_tenant_id} />
                                   ) : (
                                       <div className="space-y-4">
                                           <p className="text-muted-foreground">This unit is vacant.</p>
                                           <Button variant="outline">
                                               <Plus className="mr-2 h-4 w-4" /> Assign Tenant
                                           </Button>
                                       </div>
                                   )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="lease">
                            <Card>
                                <CardHeader><CardTitle>Lease Agreement</CardTitle></CardHeader>
                                <CardContent>
                                   {/* Use the LeaseInfoTab component */} 
                                   <LeaseInfoTab unitId={selectedUnit.id} /> 
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="maintenance">
                             <Card>
                                <CardHeader><CardTitle>Maintenance History</CardTitle></CardHeader>
                                <CardContent>
                                   {/* Use the MaintenanceListTab component */} 
                                   <MaintenanceListTab unitId={selectedUnit.id} /> 
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="payments">
                             <Card>
                                <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
                                <CardContent>
                                    {/* Use the PaymentListTab component */} 
                                    <PaymentListTab unitId={selectedUnit.id} tenantId={selectedUnit.current_tenant_id} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                   ) : (
                       <Card className="flex items-center justify-center h-64">
                           <p className="text-muted-foreground">Select a unit to view details.</p>
                       </Card>
                   )}
              </div>
            </div>
            
            {/* Property-Level Documents */}
            <Card>
                <CardHeader>
                    <CardTitle>Property Documents</CardTitle>
                    <CardDescription>Deeds, insurance, or other property-wide documents.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Document list with upload button */}
                    <div className="space-y-4">
                        <Button variant="outline" className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Upload Document
                        </Button>
                        
                        <DocumentList 
                            documents={documents} 
                            isLoading={documentsLoading}
                            error={documentsError}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Add Unit Dialog */}
            <Dialog open={addUnitDialogOpen} onOpenChange={setAddUnitDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Unit</DialogTitle>
                        <DialogDescription>
                            Create a new unit for this property. Fill in the details below.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {/* Add the AddUnitForm component */}
                    <AddUnitForm onSubmit={handleAddUnit} isLoading={addingUnit} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
