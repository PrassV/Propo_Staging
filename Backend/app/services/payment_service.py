from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, date
import uuid
import calendar

from ..db import payment as payment_db
from ..db import properties as property_db
from ..db import tenants as tenant_db
from ..models.payment import PaymentCreate, PaymentUpdate, PaymentStatus, PaymentType

logger = logging.getLogger(__name__)

async def get_payments(
    owner_id: str = None,
    property_id: str = None,
    tenant_id: str = None,
    status: str = None,
    payment_type: str = None,
    start_date: str = None,
    end_date: str = None
) -> List[Dict[str, Any]]:
    """
    Get payments, optionally filtered.
    
    Args:
        owner_id: Optional owner ID to filter by
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        status: Optional status to filter by
        payment_type: Optional payment type to filter by
        start_date: Optional start date to filter by (format: YYYY-MM-DD)
        end_date: Optional end date to filter by (format: YYYY-MM-DD)
        
    Returns:
        List of payments
    """
    return await payment_db.get_payments(
        owner_id=owner_id,
        property_id=property_id,
        tenant_id=tenant_id,
        status=status,
        payment_type=payment_type,
        start_date=start_date,
        end_date=end_date
    )

async def get_payment(payment_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a specific payment by ID.
    
    Args:
        payment_id: The payment ID
        
    Returns:
        Payment data or None if not found
    """
    return await payment_db.get_payment_by_id(payment_id)

async def create_payment(payment_data: PaymentCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new payment.
    
    Args:
        payment_data: The payment data
        owner_id: The owner ID
        
    Returns:
        Created payment data or None if creation failed
    """
    try:
        # Prepare payment data
        insert_data = payment_data.dict()
        
        # Add owner ID
        insert_data['owner_id'] = owner_id
        
        # Set created_at and updated_at timestamps
        insert_data['created_at'] = datetime.utcnow().isoformat()
        insert_data['updated_at'] = insert_data['created_at']
        
        # Generate unique ID
        insert_data['id'] = str(uuid.uuid4())
        
        # Set initial status to pending if not provided
        if 'status' not in insert_data or not insert_data['status']:
            insert_data['status'] = PaymentStatus.PENDING.value
            
        # Initialize amount_paid to 0
        insert_data['amount_paid'] = 0
        
        # Create the payment
        return await payment_db.create_payment(insert_data)
    except Exception as e:
        logger.error(f"Error creating payment: {str(e)}")
        return None

async def update_payment(payment_id: str, payment_data: PaymentUpdate) -> Optional[Dict[str, Any]]:
    """
    Update a payment.
    
    Args:
        payment_id: The payment ID to update
        payment_data: The updated payment data
        
    Returns:
        Updated payment data or None if update failed
    """
    try:
        # Get existing payment
        existing_payment = await payment_db.get_payment_by_id(payment_id)
        if not existing_payment:
            logger.error(f"Payment not found: {payment_id}")
            return None
            
        # Prepare update data
        update_data = {k: v for k, v in payment_data.dict(exclude_unset=True).items() if v is not None}
        
        # Update the payment
        return await payment_db.update_payment(payment_id, update_data)
    except Exception as e:
        logger.error(f"Error updating payment: {str(e)}")
        return None

async def delete_payment(payment_id: str) -> bool:
    """
    Delete a payment.
    
    Args:
        payment_id: The payment ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await payment_db.delete_payment(payment_id)

async def record_payment(
    payment_id: str, 
    amount: float, 
    payment_method: str, 
    receipt_url: str = None
) -> Optional[Dict[str, Any]]:
    """
    Record a payment for an existing payment record.
    
    Args:
        payment_id: The payment ID
        amount: The amount paid
        payment_method: The payment method used
        receipt_url: Optional URL to the receipt
        
    Returns:
        Updated payment data or None if update failed
    """
    try:
        return await payment_db.record_payment(
            payment_id=payment_id,
            amount=amount,
            payment_method=payment_method,
            receipt_url=receipt_url
        )
    except Exception as e:
        logger.error(f"Error recording payment: {str(e)}")
        return None

async def create_payment_receipt(payment_id: str, url: str) -> Optional[Dict[str, Any]]:
    """
    Create a payment receipt.
    
    Args:
        payment_id: The payment ID
        url: URL to the receipt document
        
    Returns:
        Created receipt data or None if creation failed
    """
    return await payment_db.create_payment_receipt(payment_id, url)

async def send_payment_reminder(payment_id: str, recipient_email: str, message: str) -> Optional[Dict[str, Any]]:
    """
    Send a payment reminder.
    
    Args:
        payment_id: The payment ID
        recipient_email: Email address to send the reminder to
        message: Message content for the reminder
        
    Returns:
        Created reminder data or None if creation failed
    """
    # In a real system, you would also implement the actual email sending here
    # For now, we just record that a reminder was sent
    
    try:
        return await payment_db.create_payment_reminder(
            payment_id=payment_id,
            recipient_email=recipient_email,
            message=message
        )
    except Exception as e:
        logger.error(f"Error sending payment reminder: {str(e)}")
        return None

async def get_overdue_payments(owner_id: str = None) -> List[Dict[str, Any]]:
    """
    Get overdue payments.
    
    Args:
        owner_id: Optional owner ID to filter by
        
    Returns:
        List of overdue payments
    """
    return await payment_db.get_overdue_payments(owner_id)

async def get_upcoming_payments(owner_id: str = None, days: int = 7) -> List[Dict[str, Any]]:
    """
    Get upcoming payments due in the next specified number of days.
    
    Args:
        owner_id: Optional owner ID to filter by
        days: Number of days to look ahead (default: 7)
        
    Returns:
        List of upcoming payments
    """
    return await payment_db.get_upcoming_payments(owner_id, days)

async def generate_rent_payments(
    property_id: str, 
    tenant_id: str, 
    amount: float, 
    due_day: int, 
    start_date: date, 
    end_date: date,
    description: str = None
) -> List[Dict[str, Any]]:
    """
    Generate recurring rent payments for a tenant.
    
    Args:
        property_id: The property ID
        tenant_id: The tenant ID
        amount: The monthly rent amount
        due_day: Day of the month when rent is due
        start_date: Start date for recurring payments
        end_date: End date for recurring payments
        description: Optional payment description
        
    Returns:
        List of created payment data
    """
    try:
        # Get property details to set owner_id
        property_data = await property_db.get_property_by_id(property_id)
        if not property_data:
            logger.error(f"Property not found: {property_id}")
            return []
            
        owner_id = property_data.get('owner_id')
        if not owner_id:
            logger.error(f"Owner ID not found for property: {property_id}")
            return []
            
        # Generate payments
        created_payments = []
        current_date = start_date
        
        while current_date <= end_date:
            # Create payment for this month
            try:
                # Calculate due date (same month, specified day)
                # If due_day is greater than days in the month, use the last day
                days_in_month = calendar.monthrange(current_date.year, current_date.month)[1]
                payment_due_day = min(due_day, days_in_month)
                due_date = date(current_date.year, current_date.month, payment_due_day)
                
                # If current date is after the due date for this month, move to next month
                if current_date.day > payment_due_day:
                    # Move to next month
                    if current_date.month == 12:
                        next_month = date(current_date.year + 1, 1, 1)
                    else:
                        next_month = date(current_date.year, current_date.month + 1, 1)
                    
                    days_in_next_month = calendar.monthrange(next_month.year, next_month.month)[1]
                    payment_due_day = min(due_day, days_in_next_month)
                    due_date = date(next_month.year, next_month.month, payment_due_day)
                
                # Only create if due date is not past the end date
                if due_date <= end_date:
                    # Create payment
                    payment_data = PaymentCreate(
                        property_id=property_id,
                        tenant_id=tenant_id,
                        amount=amount,
                        payment_type=PaymentType.RENT.value,
                        due_date=due_date.isoformat(),
                        description=description or f"Rent payment for {due_date.strftime('%B %Y')}",
                        period_start_date=current_date.isoformat(),
                        # Set period end date to last day of the month
                        period_end_date=date(
                            due_date.year, 
                            due_date.month, 
                            calendar.monthrange(due_date.year, due_date.month)[1]
                        ).isoformat()
                    )
                    
                    created_payment = await create_payment(payment_data, owner_id)
                    if created_payment:
                        created_payments.append(created_payment)
            except Exception as month_error:
                logger.error(f"Error generating payment for {current_date}: {str(month_error)}")
                
            # Move to next month
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                # Calculate last day of next month
                next_month = current_date.month + 1
                next_year = current_date.year
                if next_month > 12:
                    next_month = 1
                    next_year += 1
                    
                last_day = calendar.monthrange(next_year, next_month)[1]
                current_date = date(next_year, next_month, 1)

        return created_payments
    except Exception as e:
        logger.error(f"Error generating rent payments: {str(e)}")
        return []

async def get_payment_summary(owner_id: str) -> Dict[str, Any]:
    """
    Get a summary of payments for an owner.
    
    Args:
        owner_id: The owner ID
        
    Returns:
        Payment summary data
    """
    try:
        # Get all payments for the owner
        payments = await payment_db.get_payments(owner_id=owner_id)
        
        # Count by status
        status_counts = {}
        for status in PaymentStatus:
            status_counts[status.value] = 0
            
        for payment in payments:
            status = payment.get('status')
            if status in status_counts:
                status_counts[status] += 1
                
        # Count by payment type
        type_counts = {}
        for payment_type in PaymentType:
            type_counts[payment_type.value] = 0
            
        for payment in payments:
            payment_type = payment.get('payment_type')
            if payment_type in type_counts:
                type_counts[payment_type] += 1
                
        # Calculate total amounts
        total_due = sum(payment.get('amount', 0) for payment in payments)
        total_paid = sum(payment.get('amount_paid', 0) or 0 for payment in payments)
        total_pending = sum(
            payment.get('amount', 0) - (payment.get('amount_paid', 0) or 0)
            for payment in payments
            if payment.get('status') in [PaymentStatus.PENDING.value, PaymentStatus.PARTIALLY_PAID.value]
        )
        
        # Count overdue and upcoming payments
        today = datetime.utcnow().date().isoformat()
        overdue_payments = [
            p for p in payments 
            if p.get('due_date') < today and 
               p.get('status') in [PaymentStatus.PENDING.value, PaymentStatus.PARTIALLY_PAID.value]
        ]
        
        return {
            'total_payments': len(payments),
            'total_amount_due': total_due,
            'total_amount_paid': total_paid,
            'total_pending_amount': total_pending,
            'overdue_payments': len(overdue_payments),
            'status_counts': status_counts,
            'type_counts': type_counts
        }
    except Exception as e:
        logger.error(f"Error getting payment summary: {str(e)}")
        return {
            'total_payments': 0,
            'total_amount_due': 0,
            'total_amount_paid': 0,
            'total_pending_amount': 0,
            'overdue_payments': 0,
            'status_counts': {},
            'type_counts': {}
        } 