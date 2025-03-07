export interface PropertyUnit {
  id: string;
  unit_number: string;
  floor_number: number;
  size_sqft: number;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  is_occupied: boolean;
  tenant_id?: string;
}

export interface Property {
  id: string;
  property_name: string;
  property_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  image_url?: string;
  description?: string;
  category?: string;
  listed_in?: string;
  price?: number;
  yearly_tax_rate?: number;
  size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  garages?: number;
  garage_size?: number;
  year_built?: number;
  floors?: number;
  amenities?: string[];
  units?: PropertyUnit[];
  tenants?: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
  }>;
}

export interface PropertyFormData {
  propertyName: string;
  propertyType: string;
  numberOfUnits: number;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  surveyNumber: string;
  doorNumber: string;
  document: File | null;
  description?: string;
  category?: string;
  listedIn?: string;
  price?: number;
  yearlyTaxRate?: number;
  sizeSqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  garages?: number;
  garageSize?: number;
  yearBuilt?: number;
  floors?: number;
  amenities: string[];
  units: PropertyUnit[];
}