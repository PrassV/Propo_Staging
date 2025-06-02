from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    PARTIALLY_PAID = "partially_paid"
    CANCELLED = "cancelled"

class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    UPI = "upi"
    CHECK = "check"
    ONLINE_PLATFORM = "online_platform"
    OTHER = "other"

class PaymentType(str, Enum):
    RENT = "rent"
    SECURITY_DEPOSIT = "security_deposit"
    MAINTENANCE = "maintenance"
    UTILITY = "utility"
    LATE_FEE = "late_fee"
    OTHER = "other"

class PaymentBase(BaseModel):
    property_id: Optional[uuid.UUID] = None  # Make property_id optional (derived from unit if not provided)
    unit_id: uuid.UUID  # Required unit_id field
    lease_id: uuid.UUID  # Required lease_id field
    tenant_id: uuid.UUID
    amount_due: float = Field(..., gt=0)
    due_date: date
    payment_type: PaymentType = PaymentType.RENT
    description: Optional[str] = None
    period_start_date: Optional[date] = None
    period_end_date: Optional[date] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    amount_due: Optional[float] = Field(None, gt=0)
    status: Optional[PaymentStatus] = None
    payment_method: Optional[PaymentMethod] = None
    payment_date: Optional[date] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    period_start_date: Optional[date] = None
    period_end_date: Optional[date] = None
    notes: Optional[str] = None
    amount_paid: Optional[float] = Field(None, ge=0)

class RecordPaymentRequest(BaseModel):
    amount_paid: float = Field(..., gt=0)
    payment_date: date = Field(default_factory=date.today)
    payment_method: PaymentMethod
    notes: Optional[str] = None

class Payment(PaymentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    owner_id: uuid.UUID
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    payment_date: Optional[date] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    notes: Optional[str] = None
    amount_paid: Optional[float] = 0
    receipt_url: Optional[str] = None
    transaction_id: Optional[str] = None

class PaymentReceipt(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    payment_id: str
    url: str
    created_at: datetime

class PaymentReminder(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    payment_id: str
    sent_at: datetime
    recipient_email: str
    status: str
    message: str 