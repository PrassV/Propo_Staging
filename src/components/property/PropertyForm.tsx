import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyFormData } from '@/api/types';
import toast from 'react-hot-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

interface PropertyFormProps {
  initialData?: Partial<PropertyFormData> & { id?: string };
  onSubmit: (propertyData: PropertyFormData, images: File[]) => Promise<void>;
  onCancel: () => void;
}

const amenitiesList = [
  'power_backup', 
  'water_storage', 
  'security_guard', 
  'cctv', 
  'intercom', 
  'covered_parking', 
  'visitor_parking', 
  'two_wheeler_parking', 
  'piped_gas', 
  'rainwater_harvesting', 
  'solar_panels', 
  'lift', 
  'garden', 
  'temple', 
  'community_hall', 
  'children_play_area', 
  'vastu_compliant', 
  'pooja_room', 
  'servant_room', 
  'study_room', 
  'store_room', 
  'balcony', 
  'modular_kitchen', 
  'gym', 
  'swimming_pool', 
  'clubhouse'
];

export default function PropertyForm({ initialData, onSubmit, onCancel }: PropertyFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>(() => ({
    propertyName: initialData?.propertyName || '',
    propertyType: initialData?.propertyType || 'residential',
    addressLine1: initialData?.addressLine1 || '',
    addressLine2: initialData?.addressLine2 || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    pincode: initialData?.pincode || '',
    country: initialData?.country || '',
    numberOfUnits: initialData?.numberOfUnits || 1,
    yearlyTaxRate: initialData?.yearlyTaxRate || 0,
    sizeSqft: initialData?.sizeSqft || 0,
    bedrooms: initialData?.bedrooms || 0,
    bathrooms: initialData?.bathrooms || 0,
    kitchens: initialData?.kitchens || 0,
    garages: initialData?.garages || 0,
    garageSize: initialData?.garageSize || 0,
    yearBuilt: initialData?.yearBuilt || 0,
    floors: initialData?.floors || 0,
    amenities: initialData?.amenities || [],
    surveyNumber: initialData?.surveyNumber || '',
    doorNumber: initialData?.doorNumber || '',
  }));
  
  const [newImages, setNewImages] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    try {
      const payload: Partial<PropertyFormData> = { ...formData };
      
      await onSubmit(payload as PropertyFormData, newImages);
      setNewImages([]);
    } catch (error: unknown) {
      console.error('Error in form submission:', error);
      let errorMessage = 'Failed to submit form';
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'number' ? Number(value) || 0 : value 
    }));
  };

  const handleSelectChange = (name: keyof PropertyFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setNewImages(Array.from(event.target.files));
    }
  };

  const handleRemoveImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handler for checkbox changes (amenities)
  const handleAmenityChange = (amenity: string, checked: boolean | 'indeterminate') => {
    setFormData(prev => {
      const currentAmenities = prev.amenities || [];
      if (checked === true) {
        return { ...prev, amenities: [...currentAmenities, amenity] };
      } else {
        return { ...prev, amenities: currentAmenities.filter(item => item !== amenity) };
      }
    });
  };

  return (
    <Card className="border-none shadow-none p-0">
        <CardContent className="p-0">
           <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-semibold border-b pb-2">Basic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="propertyName">Property Name *</Label>
                    <Input id="propertyName" name="propertyName" value={formData.propertyName} onChange={handleInputChange} required disabled={loading} />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="propertyType">Property Type *</Label>
                    <Select value={formData.propertyType} onValueChange={(v) => handleSelectChange('propertyType')(v)} disabled={loading}>
                        <SelectTrigger><SelectValue placeholder="Select Type..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="residential">Residential</SelectItem>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="vacant_land">Vacant Land</SelectItem>
                            <SelectItem value="hostel_pg">Hostel/PG</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="numberOfUnits">Number of Units</Label>
                    <Input id="numberOfUnits" name="numberOfUnits" type="number" value={formData.numberOfUnits} onChange={handleInputChange} disabled={loading} min={1} />
                </div>
            </div>
            
            <h3 className="text-lg font-semibold border-b pb-2">Address</h3>
             <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input id="addressLine1" name="addressLine1" value={formData.addressLine1} onChange={handleInputChange} required disabled={loading} />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input id="addressLine2" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} disabled={loading} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="space-y-1.5">
                        <Label htmlFor="city">City *</Label>
                        <Input id="city" name="city" value={formData.city} onChange={handleInputChange} required disabled={loading} />
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="state">State *</Label>
                        <Input id="state" name="state" value={formData.state} onChange={handleInputChange} required disabled={loading} />
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="pincode">Pincode / Zip *</Label>
                        <Input id="pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} required disabled={loading} />
                    </div>
                 </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country *</Label>
                    <Input id="country" name="country" value={formData.country} onChange={handleInputChange} required disabled={loading} />
                </div>
             </div>
             
             <h3 className="text-lg font-semibold border-b pb-2">Images</h3>
             <div className="space-y-1.5">
                <Label htmlFor="images">Upload Images</Label>
                <Input 
                    id="images" 
                    name="images" 
                    type="file" 
                    multiple 
                    onChange={handleImageChange} 
                    disabled={loading} 
                    accept="image/png, image/jpeg, image/webp"
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {newImages.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Selected files:</p>
                        <ul className="list-disc list-inside text-sm space-y-1">
                            {newImages.map((file, index) => (
                                <li key={index} className="flex items-center justify-between">
                                    <span>{file.name}</span>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleRemoveImage(index)} 
                                        disabled={loading}
                                        className="p-1 h-auto"
                                      >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
             </div>

             {/* Overview Section */}
             <h3 className="text-lg font-semibold border-b pb-2">Overview</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="space-y-1.5">
                     <Label htmlFor="sizeSqft">Size (sqft)</Label>
                     <Input id="sizeSqft" name="sizeSqft" type="number" value={formData.sizeSqft} onChange={handleInputChange} disabled={loading} min={0} />
                 </div>
                 <div className="space-y-1.5">
                     <Label htmlFor="bedrooms">Bedrooms</Label>
                     <Input id="bedrooms" name="bedrooms" type="number" value={formData.bedrooms} onChange={handleInputChange} disabled={loading} min={0} />
                 </div>
                 <div className="space-y-1.5">
                     <Label htmlFor="bathrooms">Bathrooms</Label>
                     <Input id="bathrooms" name="bathrooms" type="number" value={formData.bathrooms} onChange={handleInputChange} disabled={loading} min={0} />
                 </div>
                 <div className="space-y-1.5">
                     <Label htmlFor="kitchens">Kitchens</Label>
                     <Input id="kitchens" name="kitchens" type="number" value={formData.kitchens} onChange={handleInputChange} disabled={loading} min={0} />
                 </div>
                 <div className="space-y-1.5">
                     <Label htmlFor="floors">Floors</Label>
                     <Input id="floors" name="floors" type="number" value={formData.floors} onChange={handleInputChange} disabled={loading} min={0} />
                 </div>
                  <div className="space-y-1.5">
                     <Label htmlFor="garages">Garages</Label>
                     <Input id="garages" name="garages" type="number" value={formData.garages} onChange={handleInputChange} disabled={loading} min={0} />
                 </div>
                  <div className="space-y-1.5">
                     <Label htmlFor="garageSize">Garage Size (sqft)</Label>
                     <Input id="garageSize" name="garageSize" type="number" value={formData.garageSize} onChange={handleInputChange} disabled={loading} min={0} />
                 </div>
                 <div className="space-y-1.5">
                     <Label htmlFor="yearBuilt">Year Built</Label>
                     <Input id="yearBuilt" name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleInputChange} disabled={loading} min={1800} max={new Date().getFullYear()} />
                 </div>
                 <div className="space-y-1.5">
                     <Label htmlFor="surveyNumber">Survey Number *</Label>
                     <Input id="surveyNumber" name="surveyNumber" value={formData.surveyNumber} onChange={handleInputChange} required disabled={loading} />
                 </div>
                 <div className="space-y-1.5">
                     <Label htmlFor="doorNumber">Door Number</Label>
                     <Input id="doorNumber" name="doorNumber" value={formData.doorNumber} onChange={handleInputChange} disabled={loading} />
                 </div>
             </div>

             {/* Amenities Section */}
             <h3 className="text-lg font-semibold border-b pb-2">Amenities</h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
               {amenitiesList.map((amenity) => (
                 <div key={amenity} className="flex items-center space-x-2">
                   <Checkbox 
                     id={`amenity-${amenity.replace(/\s+/g, '-')}`} 
                     checked={formData.amenities?.includes(amenity)} 
                     onCheckedChange={(checked) => handleAmenityChange(amenity, checked)}
                     disabled={loading}
                   />
                   <Label htmlFor={`amenity-${amenity.replace(/\s+/g, '-')}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                     {amenity}
                   </Label>
                 </div>
               ))}
             </div>

             {/* TODO: Document Upload Section */}
             
             <div className="flex justify-end space-x-4 pt-6 border-t">
                 <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                   Cancel
                 </Button>
                 <Button type="submit" disabled={loading}>
                   {loading ? (initialData ? 'Updating...' : 'Adding...') : (initialData ? 'Update Property' : 'Add Property')}
                 </Button>
             </div>
           </form>
        </CardContent>
    </Card>
  );
} 
