from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

# Import the database operations from shared module
from shared.database import get_by_id, create, update, delete_by_id

router = APIRouter()

class RentCalculationData(BaseModel):
    base_rent: float
    maintenance_charge: Optional[float] = 0
    water_charge: Optional[float] = 0
    electricity_charge: Optional[float] = 0
    other_charges: Optional[float] = 0
    discount: Optional[float] = 0
    previous_dues: Optional[float] = 0

class PaymentBase(BaseModel):
    property_id: str
    tenant_id: str
    amount: float
    payment_method: str  # "upi", "bank_transfer", "cash", "credit_card"
    payment_date: str
    payment_period: str  # "jan_2023", "feb_2023", etc.
    description: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: str
    status: str  # "pending", "completed", "failed", "refunded"
    created_at: str
    transaction_id: Optional[str] = None
    receipt_url: Optional[str] = None

@router.post("/calculate-rent")
async def calculate_rent(data: RentCalculationData):
    """Calculate total rent based on various components"""
    try:
        total_charges = (
            data.base_rent +
            data.maintenance_charge +
            data.water_charge +
            data.electricity_charge +
            data.other_charges +
            data.previous_dues
        )
        
        discounted_amount = total_charges - data.discount
        
        # Ensure we don't have negative rent after discount
        final_amount = max(0, discounted_amount)
        
        return {
            "base_rent": data.base_rent,
            "maintenance_charge": data.maintenance_charge,
            "water_charge": data.water_charge,
            "electricity_charge": data.electricity_charge,
            "other_charges": data.other_charges,
            "previous_dues": data.previous_dues,
            "total_charges": total_charges,
            "discount": data.discount,
            "final_amount": final_amount,
            "calculated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate rent: {str(e)}")

@router.post("/record-payment", response_model=PaymentResponse)
async def record_payment(payment: PaymentCreate):
    """Record a new payment"""
    try:
        # Validate property and tenant exist
        property_data = await get_by_id("properties", payment.property_id)
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # In a real app, you'd validate the tenant ID too
        
        # Create payment record
        payment_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        
        new_payment = {
            "id": payment_id,
            **payment.dict(),
            "status": "completed",
            "created_at": timestamp,
            "transaction_id": transaction_id,
            "receipt_url": f"https://propify.com/receipts/{payment_id}.pdf"
        }
        
        try:
            created_payment = await create("payments", new_payment)
            return created_payment
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to record payment: {str(e)}")
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to process payment: {str(e)}")

@router.get("/property/{property_id}/payments", response_model=List[PaymentResponse])
async def get_property_payments(property_id: str, limit: int = 10, offset: int = 0):
    """Get payment history for a property"""
    # In a real app, query the database
    # For now, return sample data
    property_data = await get_by_id("properties", property_id)
    if not property_data:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Mock data for demonstration
    sample_payments = []
    for i in range(min(3, limit)):
        payment_date = (datetime.now() - timedelta(days=30 * i)).isoformat()
        period = ["jan_2023", "feb_2023", "mar_2023"][i % 3]
        
        sample_payments.append({
            "id": f"payment-{i}-{property_id}",
            "property_id": property_id,
            "tenant_id": "tenant-123",
            "amount": 15000 + (i * 100),
            "payment_method": ["upi", "bank_transfer", "cash"][i % 3],
            "payment_date": payment_date,
            "payment_period": period,
            "description": f"Rent for {period}",
            "status": "completed",
            "created_at": payment_date,
            "transaction_id": f"TXN-{i}12345",
            "receipt_url": f"https://propify.com/receipts/sample-{i}.pdf"
        })
    
    return sample_payments