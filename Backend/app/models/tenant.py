from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid

# Aligned Enums (matching database schema)
class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"

class IdType(str, Enum):
    PASSPORT = "passport"
    DRIVING_LICENSE = "driving_license"
    NATIONAL_ID = "national_id"
    PAN_CARD = "pan_card"
    AADHAAR = "aadhaar"
    RATION_CARD = "ration_card"
    OTHER = "other"

class RentalType(str, Enum):
    RENT = "rent"
    LEASE = "lease"

class RentalFrequency(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    OTHER = "other"

class UtilityResponsibility(str, Enum):
    TENANT = "tenant"
    OWNER = "owner"
    SPLIT = "split"

class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"

class TenantStatus(str, Enum):
    ACTIVE = "active"
    UNASSIGNED = "unassigned"
    INACTIVE = "inactive"

# New enums for comprehensive tenant management
class OccupationCategory(str, Enum):
    STUDENT = "student"
    EMPLOYED = "employed"
    SELF_EMPLOYED = "self_employed"
    RETIRED = "retired"
    UNEMPLOYED = "unemployed"
    OTHER = "other"

class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"

class DocumentType(str, Enum):
    PROFILE_PHOTO = "profile_photo"
    ID_PROOF = "id_proof"
    INCOME_PROOF = "income_proof"
    EMPLOYMENT_LETTER = "employment_letter"
    BANK_STATEMENT = "bank_statement"
    PREVIOUS_RENTAL_AGREEMENT = "previous_rental_agreement"
    REFERENCE_LETTER = "reference_letter"
    EMERGENCY_CONTACT_PROOF = "emergency_contact_proof"
    ADDITIONAL_DOCUMENT = "additional_document"

class HistoryAction(str, Enum):
    ASSIGNED = "assigned"
    UNASSIGNED = "unassigned"
    TERMINATED = "terminated"
    RENEWED = "renewed"
    STATUS_CHANGED = "status_changed"
    PAYMENT_MADE = "payment_made"
    MAINTENANCE_REQUEST = "maintenance_request"
    LEASE_MODIFIED = "lease_modified"

class ContactMethod(str, Enum):
    EMAIL = "email"
    PHONE = "phone"
    SMS = "sms"
    WHATSAPP = "whatsapp"

class BackgroundCheckStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NOT_REQUIRED = "not_required"

# --- Tenant Model --- Based on tenants table
class TenantBase(BaseModel):
    # Basic Information
    name: str
    phone: str = Field(..., description="Phone number is required for communication")
    email: EmailStr = Field(..., description="Email is required for login and notifications")
    profile_photo_url: Optional[str] = None
    
    # Personal Details
    date_of_birth: Optional[date] = None  # Renamed from dob to match database
    dob: Optional[date] = None  # Keep for backward compatibility
    gender: Optional[Gender] = None
    family_size: Optional[int] = Field(None, ge=1, le=20)
    permanent_address: Optional[str] = None
    
    # ID and Verification
    id_type: Optional[IdType] = None
    id_number: Optional[str] = None
    id_proof_url: Optional[str] = None
    verification_status: Optional[VerificationStatus] = VerificationStatus.PENDING
    verification_notes: Optional[str] = None
    verification_date: Optional[datetime] = None
    
    # Employment and Income
    occupation: Optional[str] = None
    occupation_category: Optional[OccupationCategory] = None
    monthly_income: Optional[float] = Field(None, gt=0, description="Monthly income in INR")
    employer_name: Optional[str] = None
    employment_letter_url: Optional[str] = None
    
    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    # Banking and Financial
    bank_statement_url: Optional[str] = None
    
    # Previous Rental History
    previous_landlord_name: Optional[str] = None
    previous_landlord_phone: Optional[str] = None
    reference_letter_url: Optional[str] = None
    rental_references: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    
    # Background Check
    background_check_status: Optional[BackgroundCheckStatus] = BackgroundCheckStatus.PENDING
    background_check_url: Optional[str] = None
    
    # Status and Preferences
    status: Optional[TenantStatus] = TenantStatus.UNASSIGNED
    preferred_contact_method: Optional[ContactMethod] = ContactMethod.EMAIL
    
    # Move-in/Move-out
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    
    # Document Management
    additional_documents: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    lease_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

    # Legacy Rental/Lease Info (consider moving to a Lease model later)
    rental_type: Optional[RentalType] = None
    rental_frequency: Optional[RentalFrequency] = None
    rent: Optional[float] = Field(None, ge=0)  # Renamed from rent_amount
    rental_start_date: Optional[date] = None
    rental_end_date: Optional[date] = None
    maintenance_fee: Optional[float] = Field(None, ge=0)
    notice_period_days: Optional[int] = Field(None, ge=0)

    # Responsibilities
    electricity_responsibility: Optional[UtilityResponsibility] = UtilityResponsibility.TENANT
    water_responsibility: Optional[UtilityResponsibility] = UtilityResponsibility.TENANT
    property_tax_responsibility: Optional[UtilityResponsibility] = UtilityResponsibility.OWNER

    # Other fields from schema
    university: Optional[str] = None

class TenantCreate(BaseModel):
    # Required fields for tenant creation
    name: str
    email: EmailStr
    phone: str
    
    # Optional fields for comprehensive onboarding
    profile_photo_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    family_size: Optional[int] = Field(None, ge=1, le=20)
    permanent_address: Optional[str] = None
    
    # ID and Verification
    id_type: Optional[IdType] = None
    id_number: Optional[str] = None
    id_proof_url: Optional[str] = None
    
    # Employment and Income
    occupation: Optional[str] = None
    occupation_category: Optional[OccupationCategory] = None
    monthly_income: Optional[float] = Field(None, gt=0)
    employer_name: Optional[str] = None
    employment_letter_url: Optional[str] = None
    
    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    # Banking and References
    bank_statement_url: Optional[str] = None
    previous_landlord_name: Optional[str] = None
    previous_landlord_phone: Optional[str] = None
    reference_letter_url: Optional[str] = None
    
    # Preferences
    preferred_contact_method: Optional[ContactMethod] = ContactMethod.EMAIL
    
    # Responsibilities
    electricity_responsibility: Optional[UtilityResponsibility] = UtilityResponsibility.TENANT
    water_responsibility: Optional[UtilityResponsibility] = UtilityResponsibility.TENANT
    property_tax_responsibility: Optional[UtilityResponsibility] = UtilityResponsibility.OWNER
    
    # Additional
    university: Optional[str] = None
    notice_period_days: Optional[int] = Field(30, ge=0)
    
    # Status defaults to "unassigned"
    status: Optional[TenantStatus] = TenantStatus.UNASSIGNED

class TenantUpdate(BaseModel):
    # Make all fields optional for partial updates
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    profile_photo_url: Optional[str] = None
    
    # Personal Details
    date_of_birth: Optional[date] = None
    dob: Optional[date] = None  # Keep for backward compatibility
    gender: Optional[Gender] = None
    family_size: Optional[int] = Field(None, ge=1, le=20)
    permanent_address: Optional[str] = None
    
    # ID and Verification
    id_type: Optional[IdType] = None
    id_number: Optional[str] = None
    id_proof_url: Optional[str] = None
    verification_status: Optional[VerificationStatus] = None
    verification_notes: Optional[str] = None
    verification_date: Optional[datetime] = None
    
    # Employment and Income
    occupation: Optional[str] = None
    occupation_category: Optional[OccupationCategory] = None
    monthly_income: Optional[float] = Field(None, gt=0)
    employer_name: Optional[str] = None
    employment_letter_url: Optional[str] = None
    
    # Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    # Banking and References
    bank_statement_url: Optional[str] = None
    previous_landlord_name: Optional[str] = None
    previous_landlord_phone: Optional[str] = None
    reference_letter_url: Optional[str] = None
    
    # Status and Preferences
    status: Optional[TenantStatus] = None
    preferred_contact_method: Optional[ContactMethod] = None
    background_check_status: Optional[BackgroundCheckStatus] = None
    background_check_url: Optional[str] = None
    
    # Move-in/Move-out
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    
    # Legacy fields
    rental_type: Optional[RentalType] = None
    rental_frequency: Optional[RentalFrequency] = None
    rent: Optional[float] = Field(None, ge=0)
    rental_start_date: Optional[date] = None
    rental_end_date: Optional[date] = None
    maintenance_fee: Optional[float] = Field(None, ge=0)
    notice_period_days: Optional[int] = Field(None, ge=0)
    
    # Responsibilities
    electricity_responsibility: Optional[UtilityResponsibility] = None
    water_responsibility: Optional[UtilityResponsibility] = None
    property_tax_responsibility: Optional[UtilityResponsibility] = None
    
    # Additional
    university: Optional[str] = None

class Tenant(TenantBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None # Link to Supabase auth.users
    owner_id: uuid.UUID # ID of the owner who created this tenant
    created_at: datetime
    updated_at: Optional[datetime] = None
    # We might add fields from property_tenants here if needed for specific views
    # e.g., current_property_id, current_unit_number, current_tenancy_start_date

    class Config:
        from_attributes = True # Enable ORM mode

# Model for the property_tenants relationship (Lease/Tenancy)
class PropertyTenantLinkBase(BaseModel):
    property_id: uuid.UUID
    tenant_id: uuid.UUID
    unit_number: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None

class PropertyTenantLinkCreate(PropertyTenantLinkBase):
    # Make unit_id and tenant_id required as per requirements
    unit_id: uuid.UUID  # Added unit_id field

class PropertyTenantLinkUpdate(BaseModel):
    unit_number: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class PropertyTenantLink(PropertyTenantLinkBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Model for Tenant Invitation (based on tenant_invitations table)
class TenantInvitationBase(BaseModel):
    email: EmailStr
    property_id: uuid.UUID
    # tenant_id is often set *after* creation when linking to an existing tenant record

class TenantInvitationCreate(TenantInvitationBase):
    pass # owner_id added by service

class TenantInvitation(TenantInvitationBase):
    id: uuid.UUID
    tenant_id: Optional[uuid.UUID] = None
    owner_id: uuid.UUID
    token: str
    status: str # e.g., pending, accepted, expired
    expires_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Model for tenant assignment to unit
class TenantAssignment(BaseModel):
    tenant_id: uuid.UUID
    lease_start: date
    lease_end: Optional[date] = None
    rent_amount: Optional[float] = Field(None, ge=0)
    deposit_amount: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    class Config:
        json_schema_extra = {
            "example": {
                "tenant_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
                "lease_start": "2024-01-01",
                "lease_end": "2024-12-31",
                "rent_amount": 1500.00,
                "deposit_amount": 1500.00,
                "notes": "Assigning tenant to the unit."
            }
        }

# New model for tenant reactivation
class TenantReactivation(BaseModel):
    pass  # Empty model as we just need the tenant_id from the URL

# --- New Models for Document Management ---
class TenantDocumentBase(BaseModel):
    tenant_id: uuid.UUID
    document_type: DocumentType
    document_name: str
    file_path: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    verification_status: Optional[VerificationStatus] = VerificationStatus.PENDING
    verification_notes: Optional[str] = None
    is_required: Optional[bool] = False
    expiry_date: Optional[date] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class TenantDocumentCreate(TenantDocumentBase):
    pass

class TenantDocumentUpdate(BaseModel):
    document_name: Optional[str] = None
    verification_status: Optional[VerificationStatus] = None
    verification_notes: Optional[str] = None
    is_required: Optional[bool] = None
    expiry_date: Optional[date] = None
    metadata: Optional[Dict[str, Any]] = None

class TenantDocument(TenantDocumentBase):
    id: uuid.UUID
    upload_date: datetime
    verified_by: Optional[uuid.UUID] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- History Tracking Models ---
class TenantHistoryBase(BaseModel):
    tenant_id: uuid.UUID
    property_id: Optional[uuid.UUID] = None
    unit_id: Optional[uuid.UUID] = None
    lease_id: Optional[uuid.UUID] = None
    action: HistoryAction
    action_date: date
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rent_amount: Optional[float] = Field(None, ge=0)
    deposit_amount: Optional[float] = Field(None, ge=0)
    payment_amount: Optional[float] = Field(None, ge=0)
    termination_reason: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class TenantHistoryCreate(TenantHistoryBase):
    pass

class TenantHistory(TenantHistoryBase):
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UnitHistoryBase(BaseModel):
    unit_id: uuid.UUID
    property_id: uuid.UUID
    tenant_id: Optional[uuid.UUID] = None
    lease_id: Optional[uuid.UUID] = None
    action: HistoryAction
    action_date: date
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    rent_amount: Optional[float] = Field(None, ge=0)
    deposit_amount: Optional[float] = Field(None, ge=0)
    total_payments: Optional[float] = Field(None, ge=0)
    maintenance_costs: Optional[float] = Field(None, ge=0)
    occupancy_duration_days: Optional[int] = None
    vacancy_duration_days: Optional[int] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class UnitHistoryCreate(UnitHistoryBase):
    pass

class UnitHistory(UnitHistoryBase):
    id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Enhanced Tenant Response Models ---
class TenantHistorySummary(BaseModel):
    """Summary of tenant's rental history"""
    total_properties: int
    total_duration_months: Optional[int] = None
    total_payments: Optional[float] = None
    last_move_out_date: Optional[date] = None
    current_status: TenantStatus
    verification_completion: float  # Percentage of verification complete

class TenantWithHistory(Tenant):
    """Tenant model with history and document information"""
    documents: List[TenantDocument] = Field(default_factory=list)
    history: List[TenantHistory] = Field(default_factory=list)
    history_summary: Optional[TenantHistorySummary] = None
    verification_progress: Optional[Dict[str, bool]] = Field(default_factory=dict)

# --- File Upload Models ---
class DocumentUploadRequest(BaseModel):
    document_type: DocumentType
    document_name: str
    is_required: Optional[bool] = False
    notes: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    success: bool
    document_id: Optional[uuid.UUID] = None
    upload_url: Optional[str] = None
    message: str

# --- Verification Models ---
class TenantVerificationRequest(BaseModel):
    verification_status: VerificationStatus
    verification_notes: Optional[str] = None
    document_ids: Optional[List[uuid.UUID]] = Field(default_factory=list)

class TenantVerificationResponse(BaseModel):
    success: bool
    verification_status: VerificationStatus
    missing_documents: List[DocumentType] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    message: str

# --- Bulk Operations ---
class BulkTenantStatusUpdate(BaseModel):
    tenant_ids: List[uuid.UUID]
    new_status: TenantStatus
    notes: Optional[str] = None

class BulkTenantResponse(BaseModel):
    success_count: int
    failed_count: int
    failed_tenant_ids: List[uuid.UUID] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)