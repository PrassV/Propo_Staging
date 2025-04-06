from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
import logging
import uuid

from app.models.vendor import Vendor, VendorCreate, VendorUpdate
from app.services import vendor_service
from app.config.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(
    prefix="/vendors",
    tags=["vendors"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Response Models
class VendorResponse(BaseModel):
    vendor: Dict[str, Any]
    message: str = "Success"

class VendorsListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int

# Get all vendors (with optional filters)
@router.get("/", response_model=VendorsListResponse)
async def get_vendors(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    service_type: Optional[str] = Query(None),
    rating: Optional[float] = Query(None, ge=0, le=5),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a list of vendors associated with the current user.
    """
    try:
        # Correctly extract owner_id from the dictionary
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        vendors, total = await vendor_service.get_vendors(
            owner_id=owner_id,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order,
            service_type=service_type,
            rating=rating
        )
        return VendorsListResponse(items=vendors, total=total)
    except Exception as e:
        logger.error(f"Error getting vendors: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve vendors: {str(e)}")

# Get a specific vendor by ID
@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get details for a specific vendor.
    """
    try:
        # Correctly extract owner_id from the dictionary
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        vendor = await vendor_service.get_vendor_by_id(vendor_id)
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
            
        # Authorization check: Ensure vendor belongs to the current user
        if str(vendor.get('owner_id')) != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this vendor")
            
        return VendorResponse(vendor=vendor)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting vendor {vendor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve vendor: {str(e)}")

# Create a new vendor
@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    vendor_data: VendorCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new vendor associated with the current user (owner/admin).
    """
    try:
        # Correctly extract owner_id from the dictionary
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        vendor = await vendor_service.create_vendor(owner_id, vendor_data)
        if not vendor:
            raise HTTPException(status_code=400, detail="Vendor creation failed")
        return VendorResponse(vendor=vendor, message="Vendor created successfully")
    except Exception as e:
        logger.error(f"Error creating vendor: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create vendor: {str(e)}")

# Update a vendor
@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: uuid.UUID,
    vendor_data: VendorUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a vendor's details.
    """
    try:
        # Correctly extract owner_id from the dictionary
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        # Authorization check: Ensure vendor belongs to the current user before update
        existing_vendor = await vendor_service.get_vendor_by_id(vendor_id)
        if not existing_vendor:
             raise HTTPException(status_code=404, detail="Vendor not found")
        if str(existing_vendor.get('owner_id')) != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this vendor")

        updated_vendor = await vendor_service.update_vendor(vendor_id, vendor_data)
        if not updated_vendor:
            raise HTTPException(status_code=404, detail="Vendor not found or update failed") # Should not happen if check above passes
            
        return VendorResponse(vendor=updated_vendor, message="Vendor updated successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error updating vendor {vendor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update vendor: {str(e)}")

# Delete a vendor
@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(
    vendor_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a vendor.
    """
    try:
        # Correctly extract owner_id from the dictionary
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")

        # Authorization check: Ensure vendor belongs to the current user before deletion
        existing_vendor = await vendor_service.get_vendor_by_id(vendor_id)
        if not existing_vendor:
             raise HTTPException(status_code=404, detail="Vendor not found")
        if str(existing_vendor.get('owner_id')) != owner_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this vendor")

        deleted = await vendor_service.delete_vendor(vendor_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Vendor not found or deletion failed") # Should not happen if check above passes
            
        return None # No content
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error deleting vendor {vendor_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete vendor: {str(e)}")

# Search vendors
@router.get("/search", response_model=List[Vendor])
async def search_vendors(
    query: str = Query(..., description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Search for vendors by name or company.
    
    Only owners can search for vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to search vendors")
            
        vendors = await vendor_service.search_vendors(
            query=query,
            owner_id=user_id,
            category=category
        )
        
        return vendors
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching vendors: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search vendors")

# Update vendor rating
@router.put("/{vendor_id}/rating", response_model=Vendor)
async def update_rating(
    vendor_id: str = Path(..., description="The vendor ID"),
    rating: float = Query(..., description="The new rating value (1-5)", ge=1, le=5),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update a vendor's rating.
    
    Only owners can update ratings for their vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to update vendor ratings")
            
        # Get the existing vendor
        existing_vendor = await vendor_service.get_vendor(vendor_id)
        
        if not existing_vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
            
        # Verify ownership
        if existing_vendor.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this vendor")
            
        updated_vendor = await vendor_service.update_vendor_rating(
            vendor_id=vendor_id,
            new_rating=rating
        )
        
        if not updated_vendor:
            raise HTTPException(status_code=500, detail="Failed to update vendor rating")
            
        return updated_vendor
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vendor rating: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update vendor rating")

# Get jobs for a vendor
@router.get("/{vendor_id}/jobs", response_model=List[Dict])
async def get_vendor_jobs(
    vendor_id: str = Path(..., description="The vendor ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get maintenance jobs assigned to a vendor.
    
    Only owners can view jobs for their vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view vendor jobs")
            
        # Get the existing vendor
        existing_vendor = await vendor_service.get_vendor(vendor_id)
        
        if not existing_vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
            
        # Verify ownership
        if existing_vendor.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this vendor")
            
        jobs = await vendor_service.get_vendor_jobs(vendor_id)
        
        return jobs
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vendor jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get vendor jobs")

# Increment completed jobs count
@router.post("/{vendor_id}/completed-jobs", response_model=Vendor)
async def increment_completed_jobs(
    vendor_id: str = Path(..., description="The vendor ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Increment the completed jobs count for a vendor.
    
    Only owners can update completed jobs for their vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to update vendor information")
            
        # Get the existing vendor
        existing_vendor = await vendor_service.get_vendor(vendor_id)
        
        if not existing_vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
            
        # Verify ownership
        if existing_vendor.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this vendor")
            
        updated_vendor = await vendor_service.increment_completed_jobs(vendor_id)
        
        if not updated_vendor:
            raise HTTPException(status_code=500, detail="Failed to increment completed jobs")
            
        return updated_vendor
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing completed jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to increment completed jobs")

# Get vendor statistics
@router.get("/statistics", response_model=Dict)
async def get_vendor_statistics(
    current_user: Dict = Depends(get_current_user)
):
    """
    Get statistics about vendors.
    
    Only owners can view vendor statistics.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view vendor statistics")
            
        statistics = await vendor_service.get_vendor_statistics(user_id)
        
        return statistics
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vendor statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get vendor statistics") 