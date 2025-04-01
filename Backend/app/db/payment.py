from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
from ..config.database import supabase_client

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
    Get payments from Supabase, optionally filtered.
    
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
    try:
        query = supabase_client.table('payments').select('*, property:properties(*), tenant:tenants(*)')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
            
        if property_id:
            query = query.eq('property_id', property_id)
            
        if tenant_id:
            query = query.eq('tenant_id', tenant_id)
            
        if status:
            query = query.eq('status', status)
            
        if payment_type:
            query = query.eq('payment_type', payment_type)
            
        if start_date:
            query = query.gte('due_date', start_date)
            
        if end_date:
            query = query.lte('due_date', end_date)
            
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching payments: {response['error']}")
            return []
            
        payments = response.data or []
        
        # Process the joined data
        for payment in payments:
            if payment.get('property'):
                payment['property_details'] = payment.pop('property')
            if payment.get('tenant'):
                payment['tenant_details'] = payment.pop('tenant')
                
        return payments
    except Exception as e:
        logger.error(f"Failed to get payments: {str(e)}")
        return []

async def get_payment_by_id(payment_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a payment by ID from Supabase.
    
    Args:
        payment_id: The payment ID
        
    Returns:
        Payment data or None if not found
    """
    try:
        response = supabase_client.table('payments').select('*, property:properties(*), tenant:tenants(*)').eq('id', payment_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching payment: {response['error']}")
            return None
            
        payment = response.data
        
        # Process the joined data
        if payment:
            if payment.get('property'):
                payment['property_details'] = payment.pop('property')
            if payment.get('tenant'):
                payment['tenant_details'] = payment.pop('tenant')
                
        return payment
    except Exception as e:
        logger.error(f"Failed to get payment {payment_id}: {str(e)}")
        return None

async def create_payment(payment_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new payment in Supabase.
    
    Args:
        payment_data: The payment data to insert
        
    Returns:
        Created payment data or None if creation failed
    """
    try:
        # Prepare data for insertion
        insert_data = {**payment_data}
        if 'property_details' in insert_data:
            del insert_data['property_details']
        if 'tenant_details' in insert_data:
            del insert_data['tenant_details']
            
        response = supabase_client.table('payments').insert(insert_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating payment: {response['error']}")
            return None
            
        created_payment = response.data[0] if response.data else None
        
        # If successfully created, retrieve the full payment with joins
        if created_payment:
            return await get_payment_by_id(created_payment['id'])
            
        return None
    except Exception as e:
        logger.error(f"Failed to create payment: {str(e)}")
        return None

async def update_payment(payment_id: str, payment_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a payment in Supabase.
    
    Args:
        payment_id: The payment ID to update
        payment_data: The updated payment data
        
    Returns:
        Updated payment data or None if update failed
    """
    try:
        # Prepare data for update
        update_data = {**payment_data}
        if 'property_details' in update_data:
            del update_data['property_details']
        if 'tenant_details' in update_data:
            del update_data['tenant_details']
            
        # Add updated_at timestamp
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('payments').update(update_data).eq('id', payment_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating payment: {response['error']}")
            return None
            
        updated_payment = response.data[0] if response.data else None
        
        # If successfully updated, retrieve the full payment with joins
        if updated_payment:
            return await get_payment_by_id(updated_payment['id'])
            
        return None
    except Exception as e:
        logger.error(f"Failed to update payment {payment_id}: {str(e)}")
        return None

async def delete_payment(payment_id: str) -> bool:
    """
    Delete a payment from Supabase.
    
    Args:
        payment_id: The payment ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('payments').delete().eq('id', payment_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting payment: {response['error']}")
            return False
            
        return True
    except Exception as e:
        logger.error(f"Failed to delete payment {payment_id}: {str(e)}")
        return False

async def record_payment(payment_id: str, amount: float, payment_method: str, receipt_url: str = None) -> Optional[Dict[str, Any]]:
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
        # Get current payment data
        payment = await get_payment_by_id(payment_id)
        if not payment:
            logger.error(f"Payment not found: {payment_id}")
            return None
            
        total_amount = payment.get('amount', 0)
        amount_paid = payment.get('amount_paid', 0) or 0
        new_amount_paid = amount_paid + amount
        
        # Determine new status
        status = payment.get('status')
        if new_amount_paid >= total_amount:
            status = 'paid'
        elif new_amount_paid > 0:
            status = 'partially_paid'
            
        # Update payment record
        update_data = {
            'status': status,
            'amount_paid': new_amount_paid,
            'payment_method': payment_method,
            'payment_date': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        if receipt_url:
            update_data['receipt_url'] = receipt_url
            
        return await update_payment(payment_id, update_data)
    except Exception as e:
        logger.error(f"Failed to record payment: {str(e)}")
        return None

async def create_payment_receipt(payment_id: str, url: str) -> Optional[Dict[str, Any]]:
    """
    Create a payment receipt in Supabase.
    
    Args:
        payment_id: The payment ID
        url: URL to the receipt document
        
    Returns:
        Created receipt data or None if creation failed
    """
    try:
        receipt_data = {
            'payment_id': payment_id,
            'url': url,
            'created_at': datetime.utcnow().isoformat()
        }
        
        response = supabase_client.table('payment_receipts').insert(receipt_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating payment receipt: {response['error']}")
            return None
            
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create payment receipt: {str(e)}")
        return None

async def create_payment_reminder(payment_id: str, recipient_email: str, message: str) -> Optional[Dict[str, Any]]:
    """
    Create a payment reminder in Supabase.
    
    Args:
        payment_id: The payment ID
        recipient_email: Email address to send the reminder to
        message: Message content for the reminder
        
    Returns:
        Created reminder data or None if creation failed
    """
    try:
        reminder_data = {
            'payment_id': payment_id,
            'recipient_email': recipient_email,
            'message': message,
            'sent_at': datetime.utcnow().isoformat(),
            'status': 'sent'
        }
        
        response = supabase_client.table('payment_reminders').insert(reminder_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating payment reminder: {response['error']}")
            return None
            
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create payment reminder: {str(e)}")
        return None

async def get_overdue_payments(owner_id: str = None) -> List[Dict[str, Any]]:
    """
    Get overdue payments from Supabase.
    
    Args:
        owner_id: Optional owner ID to filter by
        
    Returns:
        List of overdue payments
    """
    try:
        today = datetime.utcnow().date().isoformat()
        
        query = supabase_client.table('payments').select('*, property:properties(*), tenant:tenants(*)')
        
        # Filter by overdue criteria
        query = query.lt('due_date', today)
        query = query.in_('status', ['pending', 'partially_paid'])
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
            
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching overdue payments: {response['error']}")
            return []
            
        payments = response.data or []
        
        # Process the joined data
        for payment in payments:
            if payment.get('property'):
                payment['property_details'] = payment.pop('property')
            if payment.get('tenant'):
                payment['tenant_details'] = payment.pop('tenant')
                
        return payments
    except Exception as e:
        logger.error(f"Failed to get overdue payments: {str(e)}")
        return []

async def get_upcoming_payments(owner_id: str = None, days: int = 7) -> List[Dict[str, Any]]:
    """
    Get upcoming payments due in the next specified number of days.
    
    Args:
        owner_id: Optional owner ID to filter by
        days: Number of days to look ahead (default: 7)
        
    Returns:
        List of upcoming payments
    """
    try:
        today = datetime.utcnow().date()
        future_date = (today + timedelta(days=days)).isoformat()
        
        query = supabase_client.table('payments').select('*, property:properties(*), tenant:tenants(*)')
        
        # Filter by upcoming criteria
        query = query.gte('due_date', today.isoformat())
        query = query.lte('due_date', future_date)
        query = query.in_('status', ['pending', 'partially_paid'])
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
            
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching upcoming payments: {response['error']}")
            return []
            
        payments = response.data or []
        
        # Process the joined data
        for payment in payments:
            if payment.get('property'):
                payment['property_details'] = payment.pop('property')
            if payment.get('tenant'):
                payment['tenant_details'] = payment.pop('tenant')
                
        return payments
    except Exception as e:
        logger.error(f"Failed to get upcoming payments: {str(e)}")
        return []

async def get_potentially_overdue_payments(today_iso: str) -> List[Dict[str, Any]]:
    """Fetch payments that are pending or partially_paid and due before a given date."""
    try:
        query = supabase_client.table('payments')\
                    .select('*')\
                    .in_('status', ['pending', 'partially_paid'])\
                    .lt('due_date', today_iso)
        
        response = await query.execute()
        
        if response.error:
            logger.error(f"Error fetching potentially overdue payments: {response.error.message}")
            return []
            
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get potentially overdue payments: {str(e)}", exc_info=True)
        return [] 