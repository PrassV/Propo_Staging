from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Form
from datetime import date
import logging
import uuid

from app.models.payment import Payment, PaymentCreate, PaymentUpdate
from app.services import payment_service
from app.config.auth import get_current_user
from app.utils.common import PaginationParams

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Get all payments (with optional filters)
@router.get("/", response_model=List[Payment])
async def get_payments(
    property_id: Optional[str] = Query(None, description="Filter by property ID"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    payment_type: Optional[str] = Query(None, description="Filter by payment type"),
    start_date: Optional[str] = Query(None, description="Filter by start date (format: YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter by end date (format: YYYY-MM-DD)"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all payments for the current user (optionally filtered).
    
    If the user is a landlord, returns payments for their properties.
    If the user is a tenant, returns only their payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        if user_type == "tenant":
            # Tenants can only see their own payments
            payments = await payment_service.get_payments(
                tenant_id=user_id,
                property_id=property_id,
                status=status,
                payment_type=payment_type,
                start_date=start_date,
                end_date=end_date
            )
        else:
            # Owners see all payments for their properties
            payments = await payment_service.get_payments(
                owner_id=user_id,
                property_id=property_id,
                tenant_id=tenant_id,
                status=status,
                payment_type=payment_type,
                start_date=start_date,
                end_date=end_date
            )
            
        return payments
    except Exception as e:
        logger.error(f"Error getting payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve payments")

# Get a specific payment by ID
@router.get("/{payment_id}", response_model=Payment)
async def get_payment(
    payment_id: str = Path(..., description="The payment ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific payment by ID.
    
    Users can only access their own payments or payments for their properties.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        payment = await payment_service.get_payment(payment_id)
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        # Check authorization
        if user_type == "tenant" and payment.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this payment")
        elif user_type == "owner" and payment.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this payment")
            
        return payment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve payment")

# Create a new payment
@router.post("/", response_model=Payment)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new payment.
    
    Only owners can create payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to create payments")
            
        created_payment = await payment_service.create_payment(
            payment_data=payment_data,
            owner_id=user_id
        )
        
        if not created_payment:
            raise HTTPException(status_code=500, detail="Failed to create payment")
            
        return created_payment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create payment")

# Update a payment
@router.put("/{payment_id}", response_model=Payment)
async def update_payment(
    payment_data: PaymentUpdate,
    payment_id: str = Path(..., description="The payment ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Update a payment.
    
    Only owners can update payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to update payments")
            
        # Get the existing payment
        existing_payment = await payment_service.get_payment(payment_id)
        
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        # Verify ownership
        if existing_payment.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this payment")
            
        updated_payment = await payment_service.update_payment(
            payment_id=payment_id,
            payment_data=payment_data
        )
        
        if not updated_payment:
            raise HTTPException(status_code=500, detail="Failed to update payment")
            
        return updated_payment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update payment")

# Delete a payment
@router.delete("/{payment_id}", response_model=dict)
async def delete_payment(
    payment_id: str = Path(..., description="The payment ID"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete a payment.
    
    Only owners can delete payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to delete payments")
            
        # Get the existing payment
        existing_payment = await payment_service.get_payment(payment_id)
        
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        # Verify ownership
        if existing_payment.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this payment")
            
        success = await payment_service.delete_payment(payment_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete payment")
            
        return {"message": "Payment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete payment")

# Record a payment
@router.post("/{payment_id}/record", response_model=Payment)
async def record_payment(
    payment_id: str = Path(..., description="The payment ID"),
    amount: float = Form(..., description="The amount paid"),
    payment_method: str = Form(..., description="The payment method used"),
    receipt_url: Optional[str] = Form(None, description="URL to the receipt document"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Record a payment for an existing payment record.
    
    Both tenants and owners can record payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing payment
        existing_payment = await payment_service.get_payment(payment_id)
        
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        # Check authorization
        if user_type == "tenant" and existing_payment.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to record payment for this payment")
        elif user_type == "owner" and existing_payment.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to record payment for this payment")
            
        updated_payment = await payment_service.record_payment(
            payment_id=payment_id,
            amount=amount,
            payment_method=payment_method,
            receipt_url=receipt_url
        )
        
        if not updated_payment:
            raise HTTPException(status_code=500, detail="Failed to record payment")
            
        return updated_payment
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record payment")

# Add a receipt to a payment
@router.post("/{payment_id}/receipts", response_model=dict)
async def add_receipt(
    payment_id: str = Path(..., description="The payment ID"),
    url: str = Form(..., description="URL to the receipt document"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Add a receipt to a payment.
    
    Both tenants and owners can add receipts to payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Get the existing payment
        existing_payment = await payment_service.get_payment(payment_id)
        
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        # Check authorization
        if user_type == "tenant" and existing_payment.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to add receipt to this payment")
        elif user_type == "owner" and existing_payment.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to add receipt to this payment")
            
        receipt = await payment_service.create_payment_receipt(
            payment_id=payment_id,
            url=url
        )
        
        if not receipt:
            raise HTTPException(status_code=500, detail="Failed to add receipt")
            
        return {"message": "Receipt added successfully", "receipt": receipt}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding receipt: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add receipt")

# Send a payment reminder
@router.post("/{payment_id}/reminders", response_model=dict)
async def send_reminder(
    payment_id: str = Path(..., description="The payment ID"),
    recipient_email: str = Form(..., description="Email address to send the reminder to"),
    message: str = Form(..., description="Message content for the reminder"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Send a payment reminder.
    
    Only owners can send payment reminders.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to send payment reminders")
            
        # Get the existing payment
        existing_payment = await payment_service.get_payment(payment_id)
        
        if not existing_payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        # Verify ownership
        if existing_payment.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to send reminder for this payment")
            
        reminder = await payment_service.send_payment_reminder(
            payment_id=payment_id,
            recipient_email=recipient_email,
            message=message
        )
        
        if not reminder:
            raise HTTPException(status_code=500, detail="Failed to send reminder")
            
        return {"message": "Reminder sent successfully", "reminder": reminder}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending reminder: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send reminder")

# Get overdue payments
@router.get("/overdue", response_model=List[Payment])
async def get_overdue_payments(
    current_user: Dict = Depends(get_current_user)
):
    """
    Get overdue payments.
    
    If the user is a landlord, returns overdue payments for their properties.
    If the user is a tenant, returns only their overdue payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # If tenant, we'll filter the overdue payments in the application layer
        overdue_payments = await payment_service.get_overdue_payments(
            owner_id=user_id if user_type == "owner" else None
        )
        
        # Filter for tenant if needed
        if user_type == "tenant":
            overdue_payments = [p for p in overdue_payments if p.get("tenant_id") == user_id]
            
        return overdue_payments
    except Exception as e:
        logger.error(f"Error getting overdue payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve overdue payments")

# Get upcoming payments
@router.get("/upcoming", response_model=List[Payment])
async def get_upcoming_payments(
    days: int = Query(7, description="Number of days to look ahead", ge=1, le=90),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get upcoming payments due in the next specified number of days.
    
    If the user is a landlord, returns upcoming payments for their properties.
    If the user is a tenant, returns only their upcoming payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # If tenant, we'll filter the upcoming payments in the application layer
        upcoming_payments = await payment_service.get_upcoming_payments(
            owner_id=user_id if user_type == "owner" else None,
            days=days
        )
        
        # Filter for tenant if needed
        if user_type == "tenant":
            upcoming_payments = [p for p in upcoming_payments if p.get("tenant_id") == user_id]
            
        return upcoming_payments
    except Exception as e:
        logger.error(f"Error getting upcoming payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve upcoming payments")

# Generate rent payments for a tenant
@router.post("/generate", response_model=List[Payment])
async def generate_rent_payments(
    property_id: str = Form(..., description="The property ID"),
    tenant_id: str = Form(..., description="The tenant ID"),
    amount: float = Form(..., description="The monthly rent amount"),
    due_day: int = Form(..., description="Day of the month when rent is due", ge=1, le=31),
    start_date: str = Form(..., description="Start date for recurring payments (format: YYYY-MM-DD)"),
    end_date: str = Form(..., description="End date for recurring payments (format: YYYY-MM-DD)"),
    description: Optional[str] = Form(None, description="Optional payment description"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Generate recurring rent payments for a tenant.
    
    Only owners can generate rent payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to generate rent payments")
            
        # Parse dates
        try:
            start_date_obj = date.fromisoformat(start_date)
            end_date_obj = date.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            
        # Validate date range
        if end_date_obj < start_date_obj:
            raise HTTPException(status_code=400, detail="End date must be after start date")
            
        created_payments = await payment_service.generate_rent_payments(
            property_id=property_id,
            tenant_id=tenant_id,
            amount=amount,
            due_day=due_day,
            start_date=start_date_obj,
            end_date=end_date_obj,
            description=description
        )
        
        if not created_payments:
            raise HTTPException(status_code=500, detail="Failed to generate rent payments")
            
        return created_payments
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating rent payments: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate rent payments")

# Get payment summary for an owner
@router.get("/summary", response_model=Dict)
async def get_payment_summary(
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a summary of payments for the current user.
    
    Only owners can view the payment summary.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type", "owner")
        
        # Check authorization
        if user_type == "tenant":
            raise HTTPException(status_code=403, detail="Tenants are not authorized to view payment summary")
            
        summary = await payment_service.get_payment_summary(user_id)
        
        return summary
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting payment summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get payment summary") 