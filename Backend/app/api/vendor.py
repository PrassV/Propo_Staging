from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
import logging

from ..models.vendor import Vendor, VendorCreate, VendorUpdate
from ..services import vendor_service
from ..config.auth import get_current_user

router = APIRouter(
    prefix="/vendors",
    tags=["vendors"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Get all vendors (with optional filters)
@router.get("/", response_model=List[Vendor])
async def get_vendors(
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all vendors for the current owner (optionally filtered).
    
    Only owners can view their vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view vendors")
            
        vendors = await vendor_service.get_vendors(
            owner_id=user_id,
            status=status,
            category=category
        )
        
        return vendors
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vendors: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vendors")

# Get a specific vendor by ID
@router.get("/{vendor_id}", response_model=Vendor)
async def get_vendor(
    vendor_id: str = Path(..., description="The vendor ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific vendor by ID.
    
    Only owners can view their vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view vendors")
            
        vendor = await vendor_service.get_vendor(vendor_id)
        
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
            
        # Verify ownership
        if vendor.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this vendor")
            
        return vendor
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting vendor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vendor")

# Create a new vendor
@router.post("/", response_model=Vendor)
async def create_vendor(
    vendor_data: VendorCreate,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new vendor.
    
    Only owners can create vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to create vendors")
            
        created_vendor = await vendor_service.create_vendor(
            vendor_data=vendor_data,
            owner_id=user_id
        )
        
        if not created_vendor:
            raise HTTPException(status_code=500, detail="Failed to create vendor")
            
        return created_vendor
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating vendor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create vendor")

# Update a vendor
@router.put("/{vendor_id}", response_model=Vendor)
async def update_vendor(
    vendor_data: VendorUpdate,
    vendor_id: str = Path(..., description="The vendor ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update a vendor.
    
    Only owners can update their vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to update vendors")
            
        # Get the existing vendor
        existing_vendor = await vendor_service.get_vendor(vendor_id)
        
        if not existing_vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
            
        # Verify ownership
        if existing_vendor.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this vendor")
            
        updated_vendor = await vendor_service.update_vendor(
            vendor_id=vendor_id,
            vendor_data=vendor_data
        )
        
        if not updated_vendor:
            raise HTTPException(status_code=500, detail="Failed to update vendor")
            
        return updated_vendor
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating vendor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update vendor")

# Delete a vendor
@router.delete("/{vendor_id}", response_model=dict)
async def delete_vendor(
    vendor_id: str = Path(..., description="The vendor ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete a vendor.
    
    Only owners can delete their vendors.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to delete vendors")
            
        # Get the existing vendor
        existing_vendor = await vendor_service.get_vendor(vendor_id)
        
        if not existing_vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
            
        # Verify ownership
        if existing_vendor.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this vendor")
            
        success = await vendor_service.delete_vendor(vendor_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete vendor")
            
        return {"message": "Vendor deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vendor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete vendor")

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