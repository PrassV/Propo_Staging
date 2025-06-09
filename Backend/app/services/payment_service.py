from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, date
import uuid
import calendar
from fastapi import HTTPException, status

from ..db import payment as payment_db
from ..db import properties as property_db
from ..db import tenants as tenant_db
from ..models.payment import PaymentCreate, PaymentUpdate, PaymentStatus, PaymentType, Payment
from . import notification_service # Import notification service

logger = logging.getLogger(__name__)

async def get_payments(
    user_id: str = None,
    user_type: str = None,
    property_id: str = None,
    tenant_id: str = None,
    status: str = None,
    payment_type: str = None,
    start_date: str = None,
    end_date: str = None,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = "due_date",
    sort_order: str = "desc"
) -> tuple[List[Dict[str, Any]], int]:
    """
    Get payments, optionally filtered.

    Args:
        user_id: The ID of the current user
        user_type: The type of the current user (owner or tenant)
        property_id: Optional property ID to filter by
        tenant_id: Optional tenant ID to filter by
        status: Optional status to filter by
        payment_type: Optional payment type to filter by
        start_date: Optional start date to filter by (format: YYYY-MM-DD)
        end_date: Optional end date to filter by (format: YYYY-MM-DD)
        skip: Number of records to skip for pagination
        limit: Maximum number of records to return
        sort_by: Field to sort by
        sort_order: Sort direction (asc or desc)

    Returns:
        Tuple of (list of payments, total count)
    """
    # Determine the owner_id based on user_type
    owner_id = None
    if user_type == 'owner':
        owner_id = user_id
    elif user_type == 'tenant':
        tenant_id = user_id

    return await payment_db.get_payments(
        owner_id=owner_id,
        property_id=property_id,
        tenant_id=tenant_id,
        status=status,
        payment_type=payment_type,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
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

async def create_payment(payment_data: dict, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new payment.

    Args:
        payment_data: The payment data
        owner_id: The owner ID

    Returns:
        Created payment data or None if creation failed
    """
    try:
        logger.info(f"Creating payment with data: {payment_data} for owner: {owner_id}")
        # Prepare payment data
        insert_data = payment_data.copy()

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

        # If unit_id and lease_id are not provided, try to derive them from tenant_id
        if 'tenant_id' in insert_data and insert_data['tenant_id']:
            if 'unit_id' not in insert_data or not insert_data['unit_id']:
                # Get tenant's current unit assignment
                tenant_assignment = await tenant_db.get_current_tenant_assignment(insert_data['tenant_id'])
                if tenant_assignment:
                    insert_data['unit_id'] = tenant_assignment.get('unit_id')
                    if 'lease_id' not in insert_data or not insert_data['lease_id']:
                        insert_data['lease_id'] = tenant_assignment.get('id')  # property_tenants.id is the lease_id
                else:
                    logger.error(f"Tenant {insert_data['tenant_id']} has no active unit assignment")
                    return None

        # Validate required fields
        if not insert_data.get('unit_id') or not insert_data.get('lease_id'):
            logger.error("Missing required fields: unit_id and lease_id are required for payments")
            return None

        logger.info(f"Inserting payment data: {insert_data}")
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

# --- Scheduled Task Logic ---

async def check_and_notify_overdue_payments():
    """Scheduled task to find overdue payments, update status, and notify."""
    logger.info("Running scheduled task: check_and_notify_overdue_payments")
    today = date.today()
    overdue_payments_found = 0
    notifications_sent = 0

    try:
        # Fetch payments that are pending or partially paid and due before today
        potentially_overdue = await payment_db.get_potentially_overdue_payments(today.isoformat())

        for payment in potentially_overdue:
            payment_id = payment.get('id')
            tenant_id = payment.get('tenant_id')
            owner_id = payment.get('owner_id') # Assuming owner_id is on payment table
            amount_due = payment.get('amount', 0)
            amount_paid = payment.get('amount_paid', 0) or 0

            if not payment_id or not tenant_id:
                logger.warning(f"Skipping potentially overdue payment due to missing ID or tenant_id: {payment}")
                continue

            overdue_payments_found += 1

            # Update payment status to overdue in DB
            # Use the existing update function but ensure it returns the updated object
            updated_payment = await payment_db.update_payment(payment_id, {'status': PaymentStatus.OVERDUE.value})
            if not updated_payment:
                 logger.error(f"Failed to update payment {payment_id} status to overdue.")
                 continue # Skip notification if status update failed

            # Trigger Notifications (Tenant and Owner)
            # Tenant Notification
            tenant_message = f"Your payment of {amount_due} for property {payment.get('property_id')} was due on {payment.get('due_date')} and is now overdue. Amount paid: {amount_paid}."
            tenant_notification_data = NotificationCreate(
                user_id=tenant_id,
                title="Payment Overdue",
                message=tenant_message,
                notification_type=NotificationType.PAYMENT_OVERDUE.value,
                priority=NotificationPriority.HIGH.value,
                methods=[NotificationMethod.IN_APP, NotificationMethod.EMAIL], # Example
                related_entity_id=payment_id,
                related_entity_type="payment"
            )
            await notification_service.create_notification(tenant_notification_data)
            notifications_sent += 1

            # Owner Notification (Optional)
            if owner_id:
                owner_message = f"Payment of {amount_due} from tenant {tenant_id} for property {payment.get('property_id')} (Due: {payment.get('due_date')}) is now overdue."
                owner_notification_data = NotificationCreate(
                    user_id=owner_id,
                    title="Tenant Payment Overdue",
                    message=owner_message,
                    notification_type=NotificationType.PAYMENT_OVERDUE.value,
                    priority=NotificationPriority.MEDIUM.value,
                    methods=[NotificationMethod.IN_APP], # Example
                    related_entity_id=payment_id,
                    related_entity_type="payment"
                )
                await notification_service.create_notification(owner_notification_data)
                notifications_sent += 1

        logger.info(f"Scheduled task finished. Checked {overdue_payments_found} potentially overdue payments. Sent {notifications_sent} notifications.")

    except Exception as e:
        logger.error(f"Error during scheduled check for overdue payments: {e}", exc_info=True)

# TODO: Add get_potentially_overdue_payments function to payment_db.py
# This function should select payments WHERE status IN ('pending', 'partially_paid') AND due_date < today

# TODO: Integrate call to check_and_notify_overdue_payments with a scheduler (APScheduler, Celery Beat, etc.)

# --- New Service Function ---
async def get_payments_for_unit(
    db_client: Any, # Note: db_client is not explicitly used here, relying on globally configured one in db modules
    unit_id: uuid.UUID,
    requesting_user_id: uuid.UUID,
    skip: int,
    limit: int
) -> Tuple[List[Payment], int]:
    """
    Get payments associated with a specific unit, performing authorization.
    Payments are associated via the tenant linked to the unit.

    Args:
        db_client: Supabase client (passed from API layer, might not be needed if db layer uses global).
        unit_id: The ID of the unit.
        requesting_user_id: The ID of the user making the request.
        skip: Pagination skip.
        limit: Pagination limit.

    Returns:
        Tuple containing a list of Payment objects and the total count.

    Raises:
        HTTPException: 403 if user is not authorized, 404 if unit not found,
                       500 for other errors.
    """
    logger.info(f"Service: Attempting to get payments for unit {unit_id} by user {requesting_user_id}")
    try:
        # 1. Authorization Check (Simplified: user owns parent property)
        #    A more robust check might verify if the user is the tenant of the unit.
        parent_property_id = await property_db.get_parent_property_id_for_unit(db_client, unit_id)
        if not parent_property_id:
            logger.warning(f"Unit {unit_id} not found during payment fetch.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")

        property_owner = await property_db.get_property_owner(db_client, parent_property_id)
        # TODO: Add check if requesting_user is the tenant of the unit
        if not property_owner or property_owner != requesting_user_id:
            logger.warning(f"User {requesting_user_id} does not own parent property {parent_property_id} of unit {unit_id}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view payments for this unit")

        # 2. Find tenants associated with the unit
        tenants_in_unit = await tenant_db.db_get_tenants_for_unit(unit_id)
        if not tenants_in_unit:
            logger.info(f"No tenants found for unit {unit_id}, returning no payments.")
            return [], 0

        # For simplicity, we'll get payments for the *first* tenant found.
        # A more complex scenario might aggregate payments if multiple tenants can be linked.
        target_tenant_id = tenants_in_unit[0].get('id')
        if not target_tenant_id:
            logger.error(f"Tenant record found for unit {unit_id} but missing ID.")
            return [], 0

        logger.info(f"Fetching payments for tenant {target_tenant_id} linked to unit {unit_id}")

        # 3. Fetch payments for the tenant using the existing DB function
        payments_list, total_count = await payment_db.get_payments(
            tenant_id=str(target_tenant_id), # Filter by tenant ID
            skip=skip,
            limit=limit
            # Add other filters (status, date range) if needed from API layer
        )

        # 4. Convert to Pydantic models
        payments = [Payment(**data) for data in payments_list]
        return payments, total_count

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"Unexpected error in get_payments_for_unit service for unit {unit_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred fetching payments")
# --- End New Service Function ---