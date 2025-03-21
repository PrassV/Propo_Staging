from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, date, timedelta
import json
import uuid

from ..db import reporting as reports_db
from ..models.reporting import (
    ReportCreate, 
    ReportUpdate, 
    ReportStatus, 
    ReportPeriod,
    PropertyPerformanceData,
    FinancialSummaryData,
    MaintenanceAnalysisData,
    RentCollectionData
)
from ..services import (
    property_service,
    tenant_service,
    payment_service,
    maintenance_service
)

logger = logging.getLogger(__name__)

async def get_reports(owner_id: str = None, report_type: str = None) -> List[Dict[str, Any]]:
    """
    Get reports for the specified owner or report type.
    
    Args:
        owner_id: Optional owner ID to filter by
        report_type: Optional report type to filter by
        
    Returns:
        List of reports
    """
    return await reports_db.get_reports(owner_id, report_type)

async def get_report(report_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a report by ID.
    
    Args:
        report_id: The report ID
        
    Returns:
        Report data or None if not found
    """
    return await reports_db.get_report_by_id(report_id)

async def create_report(report_data: ReportCreate, owner_id: str) -> Optional[Dict[str, Any]]:
    """
    Create a new report.
    
    Args:
        report_data: The report data
        owner_id: The owner ID
        
    Returns:
        Created report data or None if creation failed
    """
    try:
        # Convert Pydantic model to dict and add required fields
        report_dict = report_data.model_dump()
        report_dict['owner_id'] = owner_id
        report_dict['id'] = str(uuid.uuid4())
        report_dict['status'] = ReportStatus.PENDING.value
        report_dict['created_at'] = datetime.utcnow().isoformat()
        
        # Create the report in the database
        report = await reports_db.create_report(report_dict)
        
        if report:
            # Start generating the report asynchronously
            # In a real application, this would be a background task
            await generate_report(report['id'])
            
        return report
    except Exception as e:
        logger.error(f"Failed to create report: {str(e)}")
        return None

async def update_report(report_id: str, report_data: ReportUpdate) -> Optional[Dict[str, Any]]:
    """
    Update a report.
    
    Args:
        report_id: The report ID to update
        report_data: The updated report data
        
    Returns:
        Updated report data or None if update failed
    """
    try:
        # Get the existing report
        existing_report = await reports_db.get_report_by_id(report_id)
        if not existing_report:
            logger.error(f"Report {report_id} not found for update")
            return None
        
        # Only allow updates if the report is not currently generating
        if existing_report.get('status') == ReportStatus.GENERATING.value:
            logger.error(f"Cannot update report {report_id} while it is generating")
            return None
        
        # Convert Pydantic model to dict, filtering out None values
        update_dict = {k: v for k, v in report_data.model_dump().items() if v is not None}
        
        # If status is changing to PENDING, we'll regenerate the report
        regenerate = update_dict.get('status') == ReportStatus.PENDING.value
        
        # Update the report
        updated_report = await reports_db.update_report(report_id, update_dict)
        
        if updated_report and regenerate:
            # Regenerate the report
            await generate_report(report_id)
            
        return updated_report
    except Exception as e:
        logger.error(f"Failed to update report {report_id}: {str(e)}")
        return None

async def delete_report(report_id: str) -> bool:
    """
    Delete a report.
    
    Args:
        report_id: The report ID to delete
        
    Returns:
        True if deletion succeeded, False otherwise
    """
    return await reports_db.delete_report(report_id)

async def generate_report(report_id: str) -> Optional[Dict[str, Any]]:
    """
    Generate a report based on its type and parameters.
    
    Args:
        report_id: The report ID to generate
        
    Returns:
        Updated report data or None if generation failed
    """
    try:
        # Get the report
        report = await reports_db.get_report_by_id(report_id)
        if not report:
            logger.error(f"Report {report_id} not found for generation")
            return None
        
        # Update status to GENERATING
        await reports_db.update_report_status(report_id, ReportStatus.GENERATING.value)
        
        # Get date range for the report
        start_date, end_date = await get_report_date_range(report)
        
        # Generate the report based on its type
        file_url = None
        if report['report_type'] == 'property_performance':
            file_url = await generate_property_performance_report(report, start_date, end_date)
        elif report['report_type'] == 'financial_summary':
            file_url = await generate_financial_summary_report(report, start_date, end_date)
        elif report['report_type'] == 'maintenance_analysis':
            file_url = await generate_maintenance_analysis_report(report, start_date, end_date)
        elif report['report_type'] == 'rent_collection':
            file_url = await generate_rent_collection_report(report, start_date, end_date)
        elif report['report_type'] == 'tenant_history':
            file_url = await generate_tenant_history_report(report, start_date, end_date)
        elif report['report_type'] == 'occupancy_rate':
            file_url = await generate_occupancy_rate_report(report, start_date, end_date)
        else:
            logger.error(f"Unsupported report type: {report['report_type']}")
            await reports_db.update_report_status(report_id, ReportStatus.FAILED.value)
            return None
        
        if file_url:
            # Update report status to COMPLETED with the file URL
            return await reports_db.update_report_status(report_id, ReportStatus.COMPLETED.value, file_url)
        else:
            # Update report status to FAILED
            await reports_db.update_report_status(report_id, ReportStatus.FAILED.value)
            return None
            
    except Exception as e:
        logger.error(f"Failed to generate report {report_id}: {str(e)}")
        await reports_db.update_report_status(report_id, ReportStatus.FAILED.value)
        return None

async def get_report_date_range(report: Dict[str, Any]) -> tuple[date, date]:
    """
    Calculate the date range for a report based on its period.
    
    Args:
        report: The report data
        
    Returns:
        Tuple of (start_date, end_date)
    """
    today = date.today()
    end_date = today
    
    if report['report_period'] == ReportPeriod.LAST_MONTH.value:
        first_day = date(today.year, today.month, 1)
        last_day = first_day - timedelta(days=1)
        first_day = date(last_day.year, last_day.month, 1)
        return first_day, last_day
        
    elif report['report_period'] == ReportPeriod.LAST_QUARTER.value:
        # Calculate the first day of the current quarter
        current_quarter_month = ((today.month - 1) // 3) * 3 + 1
        first_day_current_quarter = date(today.year, current_quarter_month, 1)
        
        # Last day of previous quarter is the day before the first day of current quarter
        last_day = first_day_current_quarter - timedelta(days=1)
        
        # First day of previous quarter
        if current_quarter_month == 1:  # Current quarter is Q1
            first_day = date(today.year - 1, 10, 1)  # Previous quarter is Q4 of previous year
        else:
            first_day = date(today.year, current_quarter_month - 3, 1)
            
        return first_day, last_day
        
    elif report['report_period'] == ReportPeriod.LAST_YEAR.value:
        first_day = date(today.year - 1, 1, 1)
        last_day = date(today.year - 1, 12, 31)
        return first_day, last_day
        
    elif report['report_period'] == ReportPeriod.YEAR_TO_DATE.value:
        first_day = date(today.year, 1, 1)
        return first_day, today
        
    elif report['report_period'] == ReportPeriod.CUSTOM.value:
        if report.get('custom_start_date') and report.get('custom_end_date'):
            return report['custom_start_date'], report['custom_end_date']
        else:
            # Default to last 30 days if custom dates are not provided
            return today - timedelta(days=30), today
    
    # Default to last 30 days
    return today - timedelta(days=30), today

async def generate_property_performance_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a property performance report.
    
    Args:
        report: The report data
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        URL to the generated report file or None if generation failed
    """
    try:
        owner_id = report['owner_id']
        property_ids = report.get('filter_property_ids', [])
        
        # Get properties to include in the report
        properties = await property_service.get_properties(owner_id)
        if property_ids:
            properties = [p for p in properties if p['id'] in property_ids]
        
        # For each property, calculate performance metrics
        performance_data = []
        for prop in properties:
            property_id = prop['id']
            
            # Get payment data for the property
            payments = await payment_service.get_payments(
                owner_id=owner_id,
                property_id=property_id,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat()
            )
            
            # Calculate income
            total_income = sum(p['amount'] for p in payments if p['status'] == 'paid')
            
            # Get maintenance expenses
            maintenance_requests = await maintenance_service.get_maintenance_requests(
                owner_id=owner_id,
                property_id=property_id
            )
            maintenance_expenses = sum(
                float(m.get('actual_cost', 0)) 
                for m in maintenance_requests 
                if m.get('completed_date') and start_date <= datetime.fromisoformat(m['completed_date']).date() <= end_date
            )
            
            # Calculate occupancy rate (simplified)
            total_days = (end_date - start_date).days + 1
            tenants = await tenant_service.get_tenants(property_id=property_id)
            occupied_days = 0
            for tenant in tenants:
                lease_start = datetime.fromisoformat(tenant['lease_start_date']).date()
                lease_end = datetime.fromisoformat(tenant['lease_end_date']).date()
                
                # Calculate overlap between lease period and report period
                overlap_start = max(lease_start, start_date)
                overlap_end = min(lease_end, end_date)
                
                if overlap_end >= overlap_start:
                    occupied_days += (overlap_end - overlap_start).days + 1
            
            occupancy_rate = (occupied_days / (total_days * len(properties))) * 100 if properties else 0
            
            # Calculate other metrics
            total_expenses = maintenance_expenses  # Simplified
            net_income = total_income - total_expenses
            avg_rent = total_income / total_days if total_days > 0 else 0
            rent_growth = 0  # Would require historical data
            roi = (net_income / prop.get('purchase_price', 1)) * 100 if prop.get('purchase_price') else 0
            
            # Add to performance data
            performance_data.append(PropertyPerformanceData(
                property_id=property_id,
                property_name=prop['name'],
                total_income=total_income,
                total_expenses=total_expenses,
                net_income=net_income,
                occupancy_rate=occupancy_rate,
                avg_rent=avg_rent,
                rent_growth=rent_growth,
                maintenance_expenses=maintenance_expenses,
                roi=roi
            ))
        
        # In a real implementation, generate a PDF, CSV, Excel, etc. based on report_format
        # Here we'll just return a dummy URL to a JSON file
        file_url = f"https://example.com/reports/{report['id']}/property_performance.{report['report_format'].lower()}"
        
        return file_url
    except Exception as e:
        logger.error(f"Failed to generate property performance report: {str(e)}")
        return None

async def generate_financial_summary_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a financial summary report.
    
    Args:
        report: The report data
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        URL to the generated report file or None if generation failed
    """
    try:
        # Implementation similar to property performance report but focused on financial metrics
        # For demonstration, returning a dummy URL
        file_url = f"https://example.com/reports/{report['id']}/financial_summary.{report['report_format'].lower()}"
        return file_url
    except Exception as e:
        logger.error(f"Failed to generate financial summary report: {str(e)}")
        return None

async def generate_maintenance_analysis_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a maintenance analysis report.
    
    Args:
        report: The report data
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        URL to the generated report file or None if generation failed
    """
    try:
        # Implementation specific to maintenance analysis
        # For demonstration, returning a dummy URL
        file_url = f"https://example.com/reports/{report['id']}/maintenance_analysis.{report['report_format'].lower()}"
        return file_url
    except Exception as e:
        logger.error(f"Failed to generate maintenance analysis report: {str(e)}")
        return None

async def generate_rent_collection_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a rent collection report.
    
    Args:
        report: The report data
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        URL to the generated report file or None if generation failed
    """
    try:
        # Implementation specific to rent collection analysis
        # For demonstration, returning a dummy URL
        file_url = f"https://example.com/reports/{report['id']}/rent_collection.{report['report_format'].lower()}"
        return file_url
    except Exception as e:
        logger.error(f"Failed to generate rent collection report: {str(e)}")
        return None

async def generate_tenant_history_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a tenant history report.
    
    Args:
        report: The report data
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        URL to the generated report file or None if generation failed
    """
    try:
        # Implementation specific to tenant history analysis
        # For demonstration, returning a dummy URL
        file_url = f"https://example.com/reports/{report['id']}/tenant_history.{report['report_format'].lower()}"
        return file_url
    except Exception as e:
        logger.error(f"Failed to generate tenant history report: {str(e)}")
        return None

async def generate_occupancy_rate_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate an occupancy rate report.
    
    Args:
        report: The report data
        start_date: Start date for the report
        end_date: End date for the report
        
    Returns:
        URL to the generated report file or None if generation failed
    """
    try:
        # Implementation specific to occupancy rate analysis
        # For demonstration, returning a dummy URL
        file_url = f"https://example.com/reports/{report['id']}/occupancy_rate.{report['report_format'].lower()}"
        return file_url
    except Exception as e:
        logger.error(f"Failed to generate occupancy rate report: {str(e)}")
        return None 