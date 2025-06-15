export interface PropertyUnit {
  id: string;
  unit_number: string;
  floor_number?: number;
  size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  rent_amount?: number;
  is_occupied?: boolean;
  tenant_id?: string;
  unit_type?: string;
  unit_status?: string;
  monthly_rent?: number;
  security_deposit?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  tenant_name?: string;
  current_lease?: Lease;
  current_tenant?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface Property {
  id: string;
  property_name: string;
  property_type: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip_code?: string;
  pincode?: string;
  image_url?: string;
  image_urls?: string[];
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
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
  purchase_price?: number;
  market_value?: number;
  property_tax?: number;
  latitude?: number;
  longitude?: number;
  total_area?: number;
  built_up_area?: number;
  plot_area?: number;
  facing_direction?: string;
  construction_status?: string;
  parking_spaces?: number;
  balconies?: number;
  survey_number?: string;
  door_number?: string;
  sub_registrar_office?: string;
  village?: string;
  taluk?: string;
  district?: string;
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
  purchasePrice?: number;
  marketValue?: number;
  propertyTax?: number;
  latitude?: number;
  longitude?: number;
  totalArea?: number;
  builtUpArea?: number;
  plotArea?: number;
  facingDirection?: string;
  constructionStatus?: string;
  parkingSpaces?: number;
  balconies?: number;
  subRegistrarOffice?: string;
  village?: string;
  taluk?: string;
  district?: string;
}

export interface Lease {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit?: number;
  lease_status: string;
  lease_terms?: string;
  created_at?: string;
  updated_at?: string;
  tenant_info?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface PropertyWithUnits extends Property {
  units: PropertyUnit[];
  total_units?: number;
  occupied_units?: number;
  vacant_units?: number;
}