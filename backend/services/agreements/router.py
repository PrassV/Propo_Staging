from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import anthropic
import os
import json
from datetime import datetime, timedelta
import hashlib

router = APIRouter()
client = anthropic.Client(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Cache duration in seconds (24 hours)
CACHE_DURATION = 24 * 60 * 60

class AgreementData(BaseModel):
    landlordName: str
    landlordAddress: str
    landlordPhone: str
    tenantName: str
    tenantAddress: str
    tenantPhone: str
    tenantEmail: str
    tenantAadhaar: str
    propertyAddress: str
    propertyType: str
    monthlyRent: float
    securityDeposit: float
    leaseDuration: int
    startDate: str
    maintenanceCharges: float
    electricityBills: str
    waterCharges: str
    noticePeriod: int
    witness1Name: str
    witness1Address: str
    witness2Name: str
    witness2Address: str

# In-memory cache for demonstration purposes
# In production, use Redis or a database table
agreement_cache = {}

@router.post("/generate")
async def generate_agreement(data: AgreementData):
    try:
        # Generate cache key based on input parameters
        cache_key = hashlib.md5(
            json.dumps({
                "landlordName": data.landlordName,
                "landlordAddress": data.landlordAddress,
                "tenantName": data.tenantName,
                "propertyAddress": data.propertyAddress,
                "monthlyRent": data.monthlyRent,
                "leaseDuration": data.leaseDuration,
                "startDate": data.startDate
            }, sort_keys=True).encode()
        ).hexdigest()
        
        # Check if we have this in cache and it's not expired
        if cache_key in agreement_cache:
            cached_data = agreement_cache[cache_key]
            cache_time = cached_data["timestamp"]
            if datetime.now() - cache_time < timedelta(seconds=CACHE_DURATION):
                return cached_data["agreement"]
        
        # Create prompt for Claude to generate the rental agreement
        prompt = f"""
        Generate a standard rental agreement based on the following information:
        
        Landlord Information:
        - Name: {data.landlordName}
        - Address: {data.landlordAddress}
        - Phone: {data.landlordPhone}
        
        Tenant Information:
        - Name: {data.tenantName}
        - Address: {data.tenantAddress}
        - Phone: {data.tenantPhone}
        - Email: {data.tenantEmail}
        - Aadhaar Number: {data.tenantAadhaar}
        
        Property Information:
        - Address: {data.propertyAddress}
        - Type: {data.propertyType}
        
        Agreement Terms:
        - Monthly Rent: ₹{data.monthlyRent}
        - Security Deposit: ₹{data.securityDeposit}
        - Lease Duration: {data.leaseDuration} months
        - Start Date: {data.startDate}
        - Maintenance Charges: ₹{data.maintenanceCharges} per month
        - Electricity Bills: {data.electricityBills}
        - Water Charges: {data.waterCharges}
        - Notice Period: {data.noticePeriod} months
        
        Witnesses:
        - Witness 1: {data.witness1Name}, {data.witness1Address}
        - Witness 2: {data.witness2Name}, {data.witness2Address}
        
        Please generate a legally valid rental agreement using the above information.
        Make sure to include all standard clauses for a rental agreement in India.
        """
        
        # Generate agreement using Claude
        message = client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=4000,
            temperature=0.2,
            system="You are an expert legal document generator specialized in creating rental agreements in India.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Extract the generated agreement
        agreement = {
            "status": "success",
            "document": message.content[0].text,
            "generated_at": datetime.now().isoformat()
        }
        
        # Store in cache
        agreement_cache[cache_key] = {
            "agreement": agreement,
            "timestamp": datetime.now()
        }
        
        return agreement
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate agreement: {str(e)}")

@router.get("/template/{template_type}")
async def get_agreement_template(template_type: str):
    """Get a pre-defined agreement template by type"""
    templates = {
        "residential": "Standard Residential Rent Agreement",
        "commercial": "Commercial Property Lease",
        "short-term": "Short Term Vacation Rental",
        "pg": "Paying Guest Accommodation Agreement"
    }
    
    if template_type not in templates:
        raise HTTPException(status_code=404, detail=f"Template type '{template_type}' not found")
    
    return {"template_type": template_type, "template_name": templates[template_type]} 