from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import anthropic
import jinja2
from datetime import datetime
from typing import Optional
import os

app = FastAPI()
client = anthropic.Client(api_key=os.getenv("ANTHROPIC_API_KEY"))

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

@app.post("/generate")
async def generate_agreement(data: AgreementData):
    try:
        # Use Claude to generate the agreement content
        response = client.messages.create(
            model="claude-2",
            messages=[{
                "role": "user",
                "content": f"""Create a legally valid Indian rental agreement using these details:

Landlord Details:
- Name: {data.landlordName}
- Address: {data.landlordAddress}
- Phone: {data.landlordPhone}

Tenant Details:
- Name: {data.tenantName}
- Address: {data.tenantAddress}
- Phone: {data.tenantPhone}
- Email: {data.tenantEmail}
- Aadhaar: {data.tenantAadhaar}

Property Details:
- Address: {data.propertyAddress}
- Type: {data.propertyType}
- Monthly Rent: ₹{data.monthlyRent}
- Security Deposit: ₹{data.securityDeposit}
- Lease Duration: {data.leaseDuration} months
- Start Date: {data.startDate}

Additional Terms:
- Maintenance: ₹{data.maintenanceCharges}
- Electricity: {data.electricityBills}
- Water: {data.waterCharges}
- Notice Period: {data.noticePeriod} months

Witnesses:
1. {data.witness1Name} - {data.witness1Address}
2. {data.witness2Name} - {data.witness2Address}

Requirements:
1. Use formal legal language
2. Include standard clauses
3. Comply with Indian Registration Act
4. Format for stamp paper
5. Make court enforceable
6. Use proper structure"""
            }],
            max_tokens=4000,
            temperature=0.7
        )

        agreement_text = response.content[0].text

        # Format the agreement using a template
        template = """
        RENTAL AGREEMENT
        
        {{ agreement_text }}
        
        Date: {{ current_date }}
        Place: {{ property_city }}
        
        Signatures:
        
        _________________
        ({{ landlord_name }})
        Landlord
        
        _________________
        ({{ tenant_name }})
        Tenant
        
        Witnesses:
        
        1. _________________
           ({{ witness1_name }})
        
        2. _________________
           ({{ witness2_name }})
        """

        # Render template
        env = jinja2.Environment()
        template = env.from_string(template)
        formatted_agreement = template.render(
            agreement_text=agreement_text,
            current_date=datetime.now().strftime("%d/%m/%Y"),
            property_city=data.propertyAddress.split(",")[-1].strip(),
            landlord_name=data.landlordName,
            tenant_name=data.tenantName,
            witness1_name=data.witness1Name,
            witness2_name=data.witness2Name
        )

        return {"success": True, "agreement": formatted_agreement}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)