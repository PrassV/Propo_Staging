from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

# Import the database operations from shared module
from shared.database import get_by_id, create, update, delete_by_id, supabase_client, query_table

router = APIRouter()

class MaintenanceRequest(BaseModel):
    property_id: str
    tenant_id: str
    issue_type: str  # "plumbing", "electrical", "appliance", "structural", "other"
    description: str
    priority: str  # "low", "medium", "high", "emergency"
    attachments: Optional[List[str]] = None
    available_times: Optional[List[str]] = None

class MaintenanceResponse(MaintenanceRequest):
    id: str
    status: str  # "submitted", "scheduled", "in_progress", "completed", "cancelled"
    created_at: str
    updated_at: str
    scheduled_date: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

@router.get("/requests", response_model=List[MaintenanceResponse])
async def get_maintenance_requests(property_id: Optional[str] = None):
    """Get all maintenance requests, optionally filtered by property ID"""
    try:
        # Query Supabase directly with conditional filter
        query = """
            maintenance_requests (*,
                property:properties (
                    id,
                    property_name,
                    address_line1,
                    city
                ),
                vendor:maintenance_vendors (name)
            )
        """

        if property_id:
            result = supabase_client.table("maintenance_requests").select(query).eq("property_id", property_id).order("created_at", {"ascending": False}).execute()
        else:
            result = supabase_client.table("maintenance_requests").select(query).order("created_at", {"ascending": False}).execute()
            
        if hasattr(result, 'error') and result.error:
            raise HTTPException(status_code=500, detail=f"Failed to fetch maintenance requests: {result.error.message}")
            
        return result.data if result.data else []
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch maintenance requests: {str(e)}")

@router.post("/requests", response_model=MaintenanceResponse)
async def create_maintenance_request(request: MaintenanceRequest):
    """Create a new maintenance request"""
    request_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    new_request = {
        "id": request_id,
        **request.dict(),
        "status": "submitted",
        "created_at": timestamp,
        "updated_at": timestamp
    }
    
    try:
        created_request = await create("maintenance_requests", new_request)
        if not created_request:
            raise HTTPException(status_code=500, detail="Failed to create maintenance request")
        return created_request
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create maintenance request: {str(e)}")

@router.put("/requests/{request_id}", response_model=MaintenanceResponse)
async def update_maintenance_request(request_id: str, request_update: dict):
    """Update a maintenance request by ID"""
    existing_request = await get_by_id("maintenance_requests", request_id)
    if not existing_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
        
    updated_data = {
        **request_update,
        "updated_at": datetime.now().isoformat()
    }
    
    try:
        updated_request = await update("maintenance_requests", request_id, updated_data)
        return updated_request
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update maintenance request: {str(e)}")

@router.post("/process-maintenance", response_model=MaintenanceResponse)
async def process_maintenance_request(request: MaintenanceRequest):
    """Process a new maintenance request"""
    # For the demo, simulate a maintenance request being processed
    request_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    scheduled_date = (datetime.now() + timedelta(days=2)).isoformat()
    status = "scheduled"
    assigned_to = "vendor-123"  # In a real app, assign to an actual vendor
    
    # Normally, we would save to the database
    try:
        maintenance_data = {
            "id": request_id,
            **request.dict(),
            "status": status,
            "created_at": timestamp,
            "updated_at": timestamp,
            "scheduled_date": scheduled_date,
            "assigned_to": assigned_to,
            "resolution_notes": "Maintenance request has been reviewed and scheduled."
        }
        
        # Save to the database using the shared database module
        result = await create("maintenance_requests", maintenance_data)
        return result or maintenance_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process maintenance request: {str(e)}")

@router.get("/requests/{request_id}", response_model=MaintenanceResponse)
async def get_maintenance_request(request_id: str):
    """Get a maintenance request by ID"""
    request_data = await get_by_id("maintenance_requests", request_id)
    if not request_data:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    return request_data

@router.put("/requests/{request_id}/status")
async def update_maintenance_status(
    request_id: str, 
    status: str, 
    resolution_notes: Optional[str] = None,
    scheduled_date: Optional[str] = None,
    assigned_to: Optional[str] = None
):
    """Update the status of a maintenance request"""
    existing_request = await get_by_id("maintenance_requests", request_id)
    if not existing_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    
    # Update only the relevant fields
    update_data = {"status": status, "updated_at": datetime.now().isoformat()}
    if resolution_notes:
        update_data["resolution_notes"] = resolution_notes
    if scheduled_date:
        update_data["scheduled_date"] = scheduled_date
    if assigned_to:
        update_data["assigned_to"] = assigned_to
    
    try:
        updated_request = await update("maintenance_requests", request_id, update_data)
        return {"status": "success", "data": updated_request}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update maintenance status: {str(e)}")

class VendorBase(BaseModel):
    name: str
    contact_email: str
    contact_phone: str
    categories: List[str]
    services: List[str]
    rating: Optional[float] = None

class VendorResponse(VendorBase):
    id: str

@router.get("/vendors", response_model=List[VendorResponse])
async def get_vendors(category: Optional[str] = None):
    """Get all maintenance vendors, optionally filtered by category"""
    try:
        if category:
            # Filter vendors by category (would be done in a database query)
            # This is a very simplified version of what would typically be database filtering
            result = supabase_client.table("maintenance_vendors").select("*").contains("categories", [category]).execute()
        else:
            result = supabase_client.table("maintenance_vendors").select("*").execute()
        
        if hasattr(result, 'error') and result.error:
            raise HTTPException(status_code=500, detail=f"Failed to fetch vendors: {result.error.message}")
        
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch vendors: {str(e)}")