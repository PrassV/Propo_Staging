from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum

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
    OTHER = "other"

class PaymentType(str, Enum):
    RENT = "rent"
    SECURITY_DEPOSIT = "security_deposit"
    MAINTENANCE = "maintenance"
    UTILITY = "utility"
    LATE_FEE = "late_fee"
    OTHER = "other"

class PaymentBase(BaseModel):
    property_id: str
    tenant_id: str
    amount: float = Field(..., gt=0)
    payment_type: PaymentType
    due_date: date
    description: Optional[str] = None
    period_start_date: Optional[date] = None
    period_end_date: Optional[date] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    status: Optional[PaymentStatus] = None
    payment_method: Optional[PaymentMethod] = None
    payment_date: Optional[date] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    period_start_date: Optional[date] = None
    period_end_date: Optional[date] = None
    notes: Optional[str] = None
    amount_paid: Optional[float] = Field(None, ge=0)

class Payment(PaymentBase):
    id: str
    owner_id: str
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    payment_date: Optional[date] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    notes: Optional[str] = None
    amount_paid: Optional[float] = 0
    receipt_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class PaymentReceipt(BaseModel):
    id: str
    payment_id: str
    url: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaymentReminder(BaseModel):
    id: str
    payment_id: str
    sent_at: datetime
    recipient_email: str
    status: str
    message: str
    
    class Config:
        from_attributes = True 