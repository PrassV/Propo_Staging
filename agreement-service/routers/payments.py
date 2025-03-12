from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

router = APIRouter()

class RentCalculation(BaseModel):
    base_rent: Decimal
    maintenance_charges: Decimal
    utility_charges: Optional[Decimal]
    pending_dues: Optional[Decimal]
    applicable_taxes: Optional[Decimal]
    start_date: datetime
    end_date: datetime

@router.post("/calculate-rent")
async def calculate_rent(data: RentCalculation):
    try:
        # Complex rent calculations including prorated amounts
        total = data.base_rent + data.maintenance_charges
        if data.utility_charges:
            total += data.utility_charges
        if data.pending_dues:
            total += data.pending_dues
        if data.applicable_taxes:
            total = total * (1 + data.applicable_taxes/100)
            
        return {
            "total_amount": total,
            "breakdown": {
                "base_rent": data.base_rent,
                "maintenance": data.maintenance_charges,
                "utilities": data.utility_charges,
                "dues": data.pending_dues,
                "taxes": data.applicable_taxes
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))