from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

# Import the database operations from shared module
from shared.database import get_by_id, create, update, delete_by_id

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

@router.post("/process-maintenance", response_model=MaintenanceResponse)
async def process_maintenance_request(request: MaintenanceRequest):
    """Process a new maintenance request"""
    try:
        # Validate property exists
        property_data = await get_by_id("properties", request.property_id)
        if not property_data:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Create maintenance request
        request_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        new_request = {
            "id": request_id,
            **request.dict(),
            "status": "submitted",
            "created_at": timestamp,
            "updated_at": timestamp
        }
        
        # Save to database
        try:
            created_request = await create("maintenance_requests", new_request)
            return created_request
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create maintenance request: {str(e)}")
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to process maintenance request: {str(e)}")

@router.get("/requests/{request_id}", response_model=MaintenanceResponse)
async def get_maintenance_request(request_id: str):
    """Get a maintenance request by ID"""
    maintenance_request = await get_by_id("maintenance_requests", request_id)
    if not maintenance_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    return maintenance_request

@router.put("/requests/{request_id}/status")
async def update_maintenance_status(
    request_id: str, 
    status: str, 
    resolution_notes: Optional[str] = None,
    scheduled_date: Optional[str] = None,
    assigned_to: Optional[str] = None
):
    """Update the status of a maintenance request"""
    # Validate status
    valid_statuses = ["submitted", "scheduled", "in_progress", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    maintenance_request = await get_by_id("maintenance_requests", request_id)
    if not maintenance_request:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now().isoformat()
    }
    
    if resolution_notes:
        update_data["resolution_notes"] = resolution_notes
        
    if scheduled_date:
        update_data["scheduled_date"] = scheduled_date
        
    if assigned_to:
        update_data["assigned_to"] = assigned_to
    
    try:
        updated_request = await update("maintenance_requests", request_id, update_data)
        return {"status": "success", "maintenance_request": updated_request}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update maintenance request: {str(e)}")