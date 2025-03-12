// Shared types between frontend and FastAPI
export interface RentCalculationData {
  baseRent: number;
  maintenanceCharges: number;
  utilityCharges?: number;
  pendingDues?: number;
  applicableTaxes?: number;
  startDate: string;
  endDate: string;
}

export interface PropertyFeatures {
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  location: string;
  amenities: string[];
  propertyAge?: number;
  floorNumber?: number;
}

// More shared types...