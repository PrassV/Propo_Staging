import React, { useState, useEffect } from 'react';
import { useParams, Link, /* useNavigate */ } from 'react-router-dom'; // Commented out unused navigate
import { PropertyLeaseDetailResponse, Document as ApiDocument, PropertyFormData, UnitCreate } from '@/api/types';
import api from '@/api'; // Correct import path
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Edit, Plus, Users, Wrench, CreditCard } from 'lucide-react'; // Added icons
import { usePropertyDialog } from '@/contexts/PropertyDialogContext';
import EnhancedImageGallery from '@/components/property/EnhancedImageGallery'; // Import the enhanced image gallery
import UnitCard from '@/components/property/UnitCard'; // Import UnitCard
import DocumentList from '@/components/documents/DocumentList'; // Import DocumentList
import AddUnitForm from '@/components/property/AddUnitForm'; // Import the AddUnitForm component
import PropertyFinancialSummary from '@/components/property/PropertyFinancialSummary'; // Import the financial summary component
import PropertyLocationMap from '@/components/property/PropertyLocationMap'; // Import the location map component

// Import Dialog components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function PropertyDetailsPage() {
    const { id: propertyId } = useParams<{ id: string }>();
    // const navigate = useNavigate(); // Removed unused
    const [property, setProperty] = useState<PropertyLeaseDetailResponse | null>(null);
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
            const fetchedProperty = await api.property.getPropertyDetails(propertyId);
            setProperty(fetchedProperty);

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
        } catch (err: unknown) {
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
            propertyName: property.name,
            propertyType: '' as 'residential',
            addressLine1: property.address,
            addressLine2: undefined,
            city: '',
            state: '',
            pincode: '',
            country: '',
            description: '',
            bedrooms: undefined,
            bathrooms: undefined,
            sizeSqft: undefined,
            yearBuilt: undefined,
            category: '',
            listedIn: '',
            status: 'active',
            price: 0,
            amenities: [],
            doorNumber: '',
            floors: undefined,
            garageSize: undefined,
            garages: undefined,
            kitchens: undefined,
            numberOfUnits: property.units?.length,
            surveyNumber: '',
            yearlyTaxRate: undefined,
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
                            <CardTitle className="text-3xl">{property.name}</CardTitle>
                            <CardDescription>{property.address}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Use the EnhancedImageGallery component */}
                            <EnhancedImageGallery
                                propertyId={property.id}
                                propertyName={property.name}
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
                            <p className="text-sm text-muted-foreground">
                                Detailed property attributes can be managed via the 'Edit Property' dialog.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Units Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Units</CardTitle>
                                <CardDescription>Manage units within this property.</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => setAddUnitDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Unit
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {property.units && property.units.length > 0 ? (
                                <div className="space-y-4">
                                    {property.units.map((unit) => (
                                        <UnitCard 
                                            key={unit.id} 
                                            unit={unit}
                                            onUpdate={fetchPropertyDetails}
                                            propertyId={property.id}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground">No units found for this property.</p>
                                    <Button variant="link" onClick={() => setAddUnitDialogOpen(true)}>Add the first unit</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Financial Summary */}
                    <PropertyFinancialSummary propertyId={property.id} />

                </div>

                {/* Right Column - 1/3 width */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Location Card */}
                    <PropertyLocationMap
                        address={property.address}
                        city={property.address.split(',')[1]?.trim() || ""}
                        state={property.address.split(',')[2]?.trim() || ""}
                        pincode={property.address.split(',')[3]?.trim() || ""}
                    />

                    {/* Documents Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Documents</CardTitle>
                            <CardDescription>All related property documents.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DocumentList
                                documents={documents}
                                isLoading={documentsLoading}
                                error={documentsError}
                            />
                        </CardContent>
                    </Card>

                    {/* Quick Actions Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <Button variant="outline"><Users className="mr-2 h-4 w-4" /> Manage Tenants</Button>
                            <Button variant="outline"><Wrench className="mr-2 h-4 w-4" /> Maintenance</Button>
                            <Button variant="outline"><CreditCard className="mr-2 h-4 w-4" /> View Payments</Button>
                            {/* Add more actions as needed */}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add Unit Dialog */}
            <Dialog open={addUnitDialogOpen} onOpenChange={setAddUnitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Unit</DialogTitle>
                        <DialogDescription>
                            Enter the details for the new unit in "{property.name}".
                        </DialogDescription>
                    </DialogHeader>
                    <AddUnitForm
                        onSubmit={handleAddUnit}
                        onCancel={() => setAddUnitDialogOpen(false)}
                        isLoading={addingUnit} // Pass loading state
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
