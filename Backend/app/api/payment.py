from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Form, status
from datetime import date
import logging
import uuid

from app.models.payment import Payment, PaymentCreate, PaymentUpdate, PaymentStatus, PaymentType, PaymentMethod, RecordPaymentRequest
from app.services import payment_service, property_service
from app.config.auth import get_current_user
from app.utils.common import PaginationParams
from pydantic import BaseModel

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Response Models
class PaymentResponse(BaseModel):
    payment: Dict[str, Any]
    message: str = "Success"

class PaymentsListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int

class PaymentSummaryResponse(BaseModel):
    summary: Dict[str, Any]
    message: str = "Success"

# Get all payments (with optional filters)
@router.get("/", response_model=PaymentsListResponse)
async def get_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    property_id: Optional[uuid.UUID] = Query(None),
    tenant_id: Optional[uuid.UUID] = Query(None),
    status: Optional[PaymentStatus] = Query(None),
    payment_type: Optional[PaymentType] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    sort_by: str = Query("due_date"),
    sort_order: str = Query("desc"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a list of payments (requests/history). Filtered by user role.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        user_type = current_user.get("user_type") or current_user.get("role")

        payments, total = await payment_service.get_payments(
            user_id=user_id,
            user_type=user_type,
            property_id=property_id,
            tenant_id=tenant_id,
            status=status.value if status else None,
            payment_type=payment_type.value if payment_type else None,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return PaymentsListResponse(items=payments, total=total)
    except Exception as e:
        logger.error(f"Error getting payments: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payments: {str(e)}")

# Get a specific payment by ID
@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get details for a specific payment.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        user_type = current_user.get("user_type") or current_user.get("role")

        payment = await payment_service.get_payment_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        can_access = await payment_service.check_user_access_to_payment(user_id, user_type, payment_id)
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to view this payment")

        return PaymentResponse(payment=payment)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error getting payment {payment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment: {str(e)}")

# Create a new payment
@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_request(
    payment_data: PaymentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new payment request.
    
    Required fields: tenant_id, amount_due, due_date
    Property_id is optional (will be derived from tenant if not provided)
    Unit_id and lease_id will be automatically derived from tenant's active assignment
    Only owners can create payment requests.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type != 'owner':
             raise HTTPException(status_code=403, detail="Only property owners can create payment requests")
             
        # Validate required fields
        if not payment_data.tenant_id:
            raise HTTPException(status_code=400, detail="tenant_id is required")
            
        # Convert Pydantic model to dict
        payment_data_dict = payment_data.model_dump()
            
        # If property_id not provided, derive it from tenant
        if not payment_data_dict.get('property_id'):
            # This will be handled in the service layer along with unit_id and lease_id
            pass

        created_payment = await payment_service.create_payment(
            payment_data=payment_data_dict,
            owner_id=user_id
        )
        
        if not created_payment:
            raise HTTPException(status_code=500, detail="Failed to create payment request. Ensure tenant has an active lease.")
            
        return PaymentResponse(payment=created_payment, message="Payment request created successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error creating payment request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create payment request: {str(e)}")

# Update a payment
@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_data: PaymentUpdate,
    payment_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a payment.
    
    Only owners can update payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type") or current_user.get("role")
        
        if user_type != 'owner':
            raise HTTPException(status_code=403, detail="Only owners can update payments")
            
        payment = await payment_service.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        if payment.get("owner_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this payment")
            
        updated_payment = await payment_service.update_payment(
            payment_id=payment_id,
            payment_data=payment_data
        )
        
        if not updated_payment:
            raise HTTPException(status_code=500, detail="Failed to update payment")
            
        return PaymentResponse(payment=updated_payment)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update payment")

# Delete a payment
@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_payment_request(
    payment_id: uuid.UUID,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Cancel a pending payment request (by owner).
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type != 'owner':
             raise HTTPException(status_code=403, detail="Only owners can cancel payment requests")
        can_access = await payment_service.check_user_access_to_payment(user_id, user_type, payment_id)
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this payment request")

        cancelled = await payment_service.cancel_payment_request(payment_id)
        if not cancelled:
            raise HTTPException(status_code=404, detail="Payment request not found, already paid/cancelled, or cancellation failed")
            
        return None # No content
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error cancelling payment request {payment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cancel payment request: {str(e)}")

# Record a payment
@router.post("/{payment_id}/record", response_model=PaymentResponse)
async def record_manual_payment(
    payment_id: uuid.UUID,
    payment_details: RecordPaymentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Record a manual payment (e.g., cash, check) against a payment request.
    """
    try:
        user_id = current_user.get("id")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        user_type = current_user.get("user_type") or current_user.get("role")
        if user_type != 'owner':
             raise HTTPException(status_code=403, detail="Only owners can record manual payments")
        can_access = await payment_service.check_user_access_to_payment(user_id, user_type, payment_id)
        if not can_access:
            raise HTTPException(status_code=403, detail="Not authorized to record payment for this request")

        updated_payment = await payment_service.record_manual_payment(
            payment_id=payment_id,
            amount_paid=payment_details.amount_paid,
            payment_date=payment_details.payment_date,
            payment_method=payment_details.payment_method,
            notes=payment_details.notes
        )
        if not updated_payment:
            raise HTTPException(status_code=404, detail="Payment request not found or failed to record payment")
            
        return PaymentResponse(payment=updated_payment, message="Payment recorded successfully")
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error recording manual payment for {payment_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to record payment: {str(e)}")

# Add a receipt to a payment
@router.post("/{payment_id}/receipts", response_model=dict)
async def add_receipt(
    payment_id: uuid.UUID,
    url: str = Form(..., description="URL to the receipt document"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Add a receipt to a payment.
    
    Both tenants and owners can add receipts to payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type") or current_user.get("role")
        
        payment = await payment_service.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        if user_type == "tenant" and payment.get("tenant_id") != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to add receipt to this payment")
        elif user_type == "owner" and payment.get("owner_id") != user_id:
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
    payment_id: uuid.UUID,
    recipient_email: str = Form(..., description="Email address to send the reminder to"),
    message: str = Form(..., description="Message content for the reminder"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Send a payment reminder.
    
    Only owners can send payment reminders.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type") or current_user.get("role")
        
        if user_type != 'owner':
            raise HTTPException(status_code=403, detail="Only property owners can send payment reminders")
            
        payment = await payment_service.get_payment_by_id(payment_id)
        
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
            
        if payment.get("owner_id") != user_id:
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
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get overdue payments.
    
    If the user is a landlord, returns overdue payments for their properties.
    If the user is a tenant, returns only their overdue payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type") or current_user.get("role")
        
        overdue_payments = await payment_service.get_overdue_payments(
            owner_id=user_id if user_type == "owner" else None
        )
        
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
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get upcoming payments due in the next specified number of days.
    
    If the user is a landlord, returns upcoming payments for their properties.
    If the user is a tenant, returns only their upcoming payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type") or current_user.get("role")
        
        upcoming_payments = await payment_service.get_upcoming_payments(
            owner_id=user_id if user_type == "owner" else None,
            days=days
        )
        
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
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generate recurring rent payments for a tenant.
    
    Only owners can generate rent payments.
    """
    try:
        user_id = current_user.get("id")
        user_type = current_user.get("user_type") or current_user.get("role")
        
        if user_type != 'owner':
            raise HTTPException(status_code=403, detail="Only property owners can generate rent payments")
            
        try:
            start_date_obj = date.fromisoformat(start_date)
            end_date_obj = date.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
            
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
@router.get("/summary", response_model=PaymentSummaryResponse)
async def get_payment_summary(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a summary of payments for the owner.
    """
    try:
        owner_id = current_user.get("id")
        if not owner_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found")
            
        if current_user.get("user_type") != 'owner':
             raise HTTPException(status_code=403, detail="Only property owners can view the payment summary")

        summary = await payment_service.get_payment_summary(owner_id)
        return PaymentSummaryResponse(summary=summary)
    except Exception as e:
        logger.error(f"Error getting payment summary: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment summary: {str(e)}")

# TODO: Endpoints for initiating online payments (Stripe integration?)
# TODO: Endpoint for tenant to view their payment history/due payments?
# The generic GET / can handle this if service layer filters correctly 