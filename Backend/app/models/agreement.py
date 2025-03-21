from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum

class AgreementStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    SIGNED_TENANT = "signed_tenant"
    SIGNED_OWNER = "signed_owner"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class AgreementType(str, Enum):
    LEASE = "lease"
    RENEWAL = "renewal"
    AMENDMENT = "amendment"
    TERMINATION = "termination"
    EXTENSION = "extension"

class AgreementBase(BaseModel):
    property_id: str
    tenant_id: str
    agreement_type: AgreementType = AgreementType.LEASE
    start_date: date
    end_date: date
    monthly_rent: float
    security_deposit: float
    term_months: int = Field(..., gt=0)
    rent_due_day: int = Field(..., ge=1, le=31)
    special_terms: Optional[str] = None

class AgreementCreate(AgreementBase):
    landlord_details: Dict[str, Any]
    tenant_details: Dict[str, Any]
    property_details: Dict[str, Any]
    payment_details: Dict[str, Any]
    additional_terms: Optional[Dict[str, Any]] = None

class AgreementUpdate(BaseModel):
    status: Optional[AgreementStatus] = None
    document_url: Optional[str] = None
    signed_url: Optional[str] = None
    notes: Optional[str] = None
    special_terms: Optional[str] = None
    monthly_rent: Optional[float] = None
    end_date: Optional[date] = None
    term_months: Optional[int] = Field(None, gt=0)

class Agreement(AgreementBase):
    id: str
    owner_id: str
    status: AgreementStatus = AgreementStatus.DRAFT
    document_url: Optional[str] = None
    signed_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class AgreementTemplate(BaseModel):
    id: str
    name: str
    owner_id: str
    agreement_type: AgreementType
    template_content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_default: bool = False
    
    class Config:
        from_attributes = True

class AgreementTemplateCreate(BaseModel):
    name: str
    agreement_type: AgreementType
    template_content: str
    is_default: bool = False 