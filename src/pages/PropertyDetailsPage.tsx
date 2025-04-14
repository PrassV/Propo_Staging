import React, { useState, useEffect } from 'react';
import { useParams, Link, /* useNavigate */ } from 'react-router-dom'; // Commented out unused navigate
import { PropertyDetails, Document as ApiDocument, PropertyFormData, UnitCreate } from '@/api/types'; // Add ApiDocument, remove PropertyFormData if not used in edit flow anymore
import api from '@/api'; // Correct import path
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Edit, Plus, Users, Tool, CreditCard } from 'lucide-react'; // Added icons
import { usePropertyDialog } from '@/contexts/PropertyDialogContext';
import EnhancedImageGallery from '@/components/property/EnhancedImageGallery'; // Import the enhanced image gallery
import UnitCard from '@/components/property/UnitCard'; // Import UnitCard
import DocumentList from '@/components/documents/DocumentList'; // Import DocumentList
import AddUnitForm from '@/components/property/AddUnitForm'; // Import the AddUnitForm component
import PropertyFinancialSummary from '@/components/property/PropertyFinancialSummary'; // Import the financial summary component
import PropertyLocationMap from '@/components/property/PropertyLocationMap'; // Import the location map component
import LeaseManagement from '@/components/LeaseManagement'; // Import the LeaseManagement component

// Import Dialog components
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

            // **** Remove Placeholder Data ****
            // console.warn("Using placeholder data for PropertyDetailsPage");
            // await new Promise(resolve => setTimeout(resolve, 500));
            // const placeholder: PropertyDetails = { /* ... placeholder object ... */ };
            // setProperty(placeholder);
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

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - 2/3 width */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Property Header & Image Gallery */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl">{property.property_name}</CardTitle>
                            <CardDescription>{`${property.address_line1}, ${property.city}, ${property.state}`}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Use the EnhancedImageGallery component */}
                            <EnhancedImageGallery
                                propertyId={property.id}
                                propertyName={property.property_name}
                                className="mb-6" // Add margin if needed
                            />
                        </CardContent>
                    </Card>

                    {/* Property Overview & Amenities Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Overview & Amenities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                {/* Display overview details if they exist */}
                                {property.area && <div><span className="font-semibold">Size:</span> {property.area} {property.area_unit || 'sqft'}</div>} {/* Use area and area_unit */}
                                {typeof property.bedrooms === 'number' && <div><span className="font-semibold">Bedrooms:</span> {property.bedrooms}</div>}
                                {typeof property.bathrooms === 'number' && <div><span className="font-semibold">Bathrooms:</span> {property.bathrooms}</div>}
                                {property.year_built && <div><span className="font-semibold">Year Built:</span> {property.year_built}</div>}
                                {/* Add other fields like floors, kitchens, garages if available in PropertyDetails type */}
                            </div>
                            {/* Display amenities if they exist */}
                            {property.amenities && property.amenities.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2 text-sm">Amenities:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {property.amenities.map((amenity) => (
                                            <span key={amenity} className="bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-0.5 rounded">
                                                {amenity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Display description if it exists */}
                            {property.description && (
                                <div>
                                    <h4 className="font-semibold mb-2 text-sm">Description:</h4>
                                    <p className="text-sm text-muted-foreground">{property.description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* NEW: Financial Summary Card */}
                    <PropertyFinancialSummary propertyId={property.id} />

                    {/* NEW: Location Map Card */}
                    <PropertyLocationMap
                        address={property.address_line1}
                        city={property.city}
                        state={property.state}
                        pincode={property.pincode || ''}
                    />

                    {/* Property-Level Documents Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Property Documents</CardTitle>
                            {/* TODO: Add button/mechanism to upload property-level documents */}
                        </CardHeader>
                        <CardContent>
                            <DocumentList
                                documents={documents}
                                isLoading={documentsLoading}
                                error={documentsError}
                                // Add delete/upload handlers if needed
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - 1/3 width */}
                <div className="space-y-6">
                    {/* Quick Stats Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Total Units:</span>
                                    <span className="font-medium">{property.units?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Occupied Units:</span>
                                    <span className="font-medium">
                                        {property.units?.filter(u => u.status === 'Occupied').length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Vacant Units:</span>
                                    <span className="font-medium">
                                        {property.units?.filter(u => u.status === 'Vacant').length || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Occupancy Rate:</span>
                                    <span className="font-medium">
                                        {property.units?.length
                                            ? Math.round((property.units.filter(u => u.status === 'Occupied').length / property.units.length) * 100)
                                            : 0}%
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Property Actions Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button className="w-full" onClick={() => setAddUnitDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Add Unit
                            </Button>
                            <Button className="w-full" asChild>
                                <Link to={`/dashboard/properties/${property.id}/leases`}>
                                    <Users className="mr-2 h-4 w-4" /> Manage Leases
                                </Link>
                            </Button>
                            <Button className="w-full" asChild>
                                <Link to="/dashboard/maintenance">
                                    <Tool className="mr-2 h-4 w-4" /> Maintenance
                                </Link>
                            </Button>
                            <Button className="w-full" asChild>
                                <Link to="/dashboard/payments">
                                    <CreditCard className="mr-2 h-4 w-4" /> Payments
                                </Link>
                            </Button>
                            {/* Add more action buttons as needed */}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Units Section - Full Width */}
            <div>
                <div className="text-xl font-semibold mb-4">Units</div>
                <div className="space-y-4">
                {(property?.units?.length ?? 0) === 0 && <p className="text-muted-foreground text-sm">No units added yet.</p>}
                {property?.units?.map(unit => (
                    <UnitCard
                        key={unit.id}
                        unit={unit}
                    />
                ))}
            </div>

            {/* REMOVED: Old Unit Details Tabs Section */}
            {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> ... Tabs ... </div> */}

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
                    <AddUnitForm
                        onSubmit={handleAddUnit}
                        onCancel={() => setAddUnitDialogOpen(false)}
                        isLoading={addingUnit}
                    />
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
};
