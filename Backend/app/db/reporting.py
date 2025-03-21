from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from ..config.database import supabase_client

logger = logging.getLogger(__name__)

async def get_reports(owner_id: str = None, report_type: str = None) -> List[Dict[str, Any]]:
    """
    Get reports from Supabase, optionally filtered by owner and type.
    
    Args:
        owner_id: Optional owner ID to filter by
        report_type: Optional report type to filter by
        
    Returns:
        List of reports
    """
    try:
        query = supabase_client.table('reports').select('*')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
        
        if report_type:
            query = query.eq('report_type', report_type)
            
        # Order by most recent
        query = query.order('created_at', desc=True)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching reports: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get reports: {str(e)}")
        return []

async def get_report_by_id(report_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a report by ID from Supabase.
    
    Args:
        report_id: The report ID
        
    Returns:
        Report data or None if not found
    """
    try:
        response = supabase_client.table('reports').select('*').eq('id', report_id).single().execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching report: {response['error']}")
            return None
        
        return response.data
    except Exception as e:
        logger.error(f"Failed to get report {report_id}: {str(e)}")
        return None

async def create_report(report_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new report in Supabase.
    
    Args:
        report_data: The report data to insert
        
    Returns:
        Created report data or None if creation failed
    """
    try:
        response = supabase_client.table('reports').insert(report_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating report: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create report: {str(e)}")
        return None

async def update_report(report_id: str, report_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a report in Supabase.
    
    Args:
        report_id: The report ID to update
        report_data: The updated report data
        
    Returns:
        Updated report data or None if update failed
    """
    try:
        # Add updated_at timestamp
        report_data['updated_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('reports').update(report_data).eq('id', report_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating report: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update report {report_id}: {str(e)}")
        return None

async def delete_report(report_id: str) -> bool:
    """
    Delete a report from Supabase.
    
    Args:
        report_id: The report ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('reports').delete().eq('id', report_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting report: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete report {report_id}: {str(e)}")
        return False

async def update_report_status(report_id: str, status: str, file_url: str = None) -> Optional[Dict[str, Any]]:
    """
    Update a report's status in Supabase.
    
    Args:
        report_id: The report ID to update
        status: The new status
        file_url: Optional URL to the generated report file
        
    Returns:
        Updated report data or None if update failed
    """
    try:
        update_data = {
            'status': status,
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        if status == 'completed' and file_url:
            update_data['file_url'] = file_url
            update_data['completed_at'] = datetime.utcnow().isoformat()
        
        response = supabase_client.table('reports').update(update_data).eq('id', report_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating report status: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update report status {report_id}: {str(e)}")
        return None

async def get_report_templates(owner_id: str = None, report_type: str = None) -> List[Dict[str, Any]]:
    """
    Get report templates from Supabase.
    
    Args:
        owner_id: Optional owner ID to filter by
        report_type: Optional report type to filter by
        
    Returns:
        List of report templates
    """
    try:
        query = supabase_client.table('report_templates').select('*')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
        
        if report_type:
            query = query.eq('report_type', report_type)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching report templates: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get report templates: {str(e)}")
        return []

async def get_report_schedules(owner_id: str = None, active_only: bool = False) -> List[Dict[str, Any]]:
    """
    Get report schedules from Supabase.
    
    Args:
        owner_id: Optional owner ID to filter by
        active_only: If True, only return active schedules
        
    Returns:
        List of report schedules
    """
    try:
        query = supabase_client.table('report_schedules').select('*')
        
        if owner_id:
            query = query.eq('owner_id', owner_id)
        
        if active_only:
            query = query.eq('active', True)
        
        response = query.execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error fetching report schedules: {response['error']}")
            return []
        
        return response.data or []
    except Exception as e:
        logger.error(f"Failed to get report schedules: {str(e)}")
        return []

async def create_report_schedule(schedule_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Create a new report schedule in Supabase.
    
    Args:
        schedule_data: The schedule data to insert
        
    Returns:
        Created schedule data or None if creation failed
    """
    try:
        response = supabase_client.table('report_schedules').insert(schedule_data).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error creating report schedule: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to create report schedule: {str(e)}")
        return None

async def update_report_schedule(schedule_id: str, schedule_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Update a report schedule in Supabase.
    
    Args:
        schedule_id: The schedule ID to update
        schedule_data: The updated schedule data
        
    Returns:
        Updated schedule data or None if update failed
    """
    try:
        response = supabase_client.table('report_schedules').update(schedule_data).eq('id', schedule_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error updating report schedule: {response['error']}")
            return None
        
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Failed to update report schedule {schedule_id}: {str(e)}")
        return None

async def delete_report_schedule(schedule_id: str) -> bool:
    """
    Delete a report schedule from Supabase.
    
    Args:
        schedule_id: The schedule ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    try:
        response = supabase_client.table('report_schedules').delete().eq('id', schedule_id).execute()
        
        if "error" in response and response["error"]:
            logger.error(f"Error deleting report schedule: {response['error']}")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Failed to delete report schedule {schedule_id}: {str(e)}")
        return False 