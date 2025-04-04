import React, { useState, useEffect, useMemo } from 'react';
import { Property } from '@/api/types';
import { getProperties } from '@/api/services/propertyService';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { usePropertyDialog } from '@/contexts/PropertyDialogContext'; 

export default function PropertyList() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const { openDialog } = usePropertyDialog(); 

    const fetchProperties = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getProperties(); 
            setProperties(response.items || []);
        } catch (err: unknown) {
            console.error("Error fetching properties:", err);
            setError(err instanceof Error ? err.message : 'Failed to load properties.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNewProperty = () => {
        openDialog(null, fetchProperties); 
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    const filteredProperties = useMemo(() => {
        return properties.filter(property => {
            const matchesSearch = 
                property.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                property.address_line1.toLowerCase().includes(searchTerm.toLowerCase()) ||
                property.city.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = 
                filterStatus === 'all' || 
                (filterStatus === 'rented' && property.status === 'Rented') ||
                (filterStatus === 'vacant' && property.status === 'Vacant') ||
                (filterStatus === 'for_sale' && property.status === 'For Sale');

            return matchesSearch && matchesStatus;
        });
    }, [properties, searchTerm, filterStatus]);

    const getStatusVariant = (status: Property['status']): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'Rented': return 'default';
            case 'Vacant': return 'secondary';
            case 'For Sale': return 'outline';
            default: return 'secondary';
        }
    };

    if (loading) {
        return (
          <div className="min-h-[calc(100vh-theme(spacing.16))] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        );
      }
    
      if (error) {
        return (
          <div className="p-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        );
      }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-wide">My Properties</h1>
                <Button onClick={handleAddNewProperty}>
                    <Plus size={20} className="mr-2" />
                    Add New Property
                </Button>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name, address, city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Rented">Rented</SelectItem>
                        <SelectItem value="Vacant">Vacant</SelectItem>
                        <SelectItem value="For Sale">For Sale</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Grid */}
            {filteredProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProperties.map(property => (
                        <Link key={property.id} to={`/property/${property.id}`} className="block">
                           <Card className="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col group overflow-hidden">
                                <div className="relative flex-shrink-0">
                                    <div className="w-full h-48 bg-muted rounded-t-md flex items-center justify-center overflow-hidden">
                                        {property.image_url ? 
                                            <img src={property.image_url} alt={property.property_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/> : 
                                            <span className="text-muted-foreground text-sm">No Image</span>}
                                    </div>
                                    <Badge variant={getStatusVariant(property.status)} className="absolute top-2 right-2">{property.status || 'Unknown'}</Badge>
                                </div>
                                <CardHeader className="flex-grow">
                                    <CardTitle className="truncate">{property.property_name}</CardTitle>
                                    <CardDescription>{`${property.address_line1}, ${property.city}`}</CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-0">
                                     {/* <p className="text-sm text-muted-foreground">Rent: ${property.rent_amount || 'N/A'}</p> */}
                                </CardFooter>
                           </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-16 text-muted-foreground">
                        <h3 className="text-lg font-semibold">No Properties Found</h3>
                        <p>No properties match your current search and filter criteria.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
