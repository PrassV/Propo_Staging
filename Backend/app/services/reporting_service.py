from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, date, timedelta
import json
import uuid
from fastapi import BackgroundTasks
import io
import csv

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
# Import the actual client from config
from ..config.database import supabase_client
from ..db import properties as properties_db
from ..db import tenants as tenants_db
from ..db import payment as payment_db
from ..db import maintenance as maintenance_db

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

async def create_report(
    report_data: ReportCreate, 
    owner_id: str, 
    background_tasks: BackgroundTasks
) -> Optional[Dict[str, Any]]:
    """
    Create a new report.
    
    Args:
        report_data: The report data
        owner_id: The owner ID
        background_tasks: BackgroundTasks for generating the report
        
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
            # Use background task instead of awaiting directly
            background_tasks.add_task(generate_report, report['id'])
            
        return report
    except Exception as e:
        logger.error(f"Failed to create report entry: {str(e)}")
        return None

async def update_report(
    report_id: str, 
    report_data: ReportUpdate, 
    background_tasks: BackgroundTasks
) -> Optional[Dict[str, Any]]:
    """
    Update a report.
    
    Args:
        report_id: The report ID to update
        report_data: The updated report data
        background_tasks: BackgroundTasks for regenerating the report
        
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
            return existing_report
        
        # Convert Pydantic model to dict, filtering out None values
        update_dict = {k: v for k, v in report_data.model_dump(exclude_unset=True).items() if v is not None}
        
        # If status is changing to PENDING, we'll regenerate the report
        regenerate = update_dict.get('status') == ReportStatus.PENDING.value
        
        # Update the report
        updated_report = await reports_db.update_report(report_id, update_dict)
        
        if updated_report and regenerate:
            # Use background task for regeneration
            background_tasks.add_task(generate_report, report_id)
            
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
    report = None
    try:
        report = await reports_db.get_report_by_id(report_id)
        if not report:
            logger.error(f"[Background] Report {report_id} not found for generation")
            return None
        
        if report.get('status') in [ReportStatus.COMPLETED.value, ReportStatus.FAILED.value]:
            logger.warning(f"[Background] Report {report_id} generation skipped, status is already '{report.get('status')}'.")
            return report

        logger.info(f"[Background] Starting generation for report {report_id} ({report.get('report_type')})" )
        await reports_db.update_report_status(report_id, ReportStatus.GENERATING.value)
        
        start_date, end_date = await get_report_date_range(report)
        
        file_url = None
        report_type = report.get('report_type')
        
        if report_type == 'property_performance':
            file_url = await generate_property_performance_report(report, start_date, end_date)
        elif report_type == 'financial_summary':
            file_url = await generate_financial_summary_report(report, start_date, end_date)
        elif report_type == 'maintenance_analysis':
            file_url = await generate_maintenance_analysis_report(report, start_date, end_date)
        elif report_type == 'rent_collection':
            file_url = await generate_rent_collection_report(report, start_date, end_date)
        elif report_type == 'tenant_history':
            file_url = await generate_tenant_history_report(report, start_date, end_date)
        elif report_type == 'occupancy_rate':
            file_url = await generate_occupancy_rate_report(report, start_date, end_date)
        else:
            logger.error(f"[Background] Unsupported report type: {report_type}")
            raise ValueError(f"Unsupported report type: {report_type}")
        
        if file_url:
            logger.info(f"[Background] Report {report_id} generated successfully. URL: {file_url}")
            return await reports_db.update_report_status(report_id, ReportStatus.COMPLETED.value, file_url)
        else:
            raise RuntimeError(f"Report generation for {report_type} failed to produce a file URL.")
            
    except Exception as e:
        logger.error(f"[Background] Failed to generate report {report_id}: {str(e)}", exc_info=True)
        if report:
            try:
                await reports_db.update_report_status(report_id, ReportStatus.FAILED.value)
            except Exception as db_err:
                logger.error(f"[Background] CRITICAL: Failed to update report {report_id} status to FAILED after error: {db_err}")
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
    Generate a property performance report including income, expenses, occupancy.
    Uploads the result as a CSV file to storage.
    """
    owner_id = report.get("owner_id")
    report_id = report.get("id")
    property_ids_filter = report.get("parameters", {}).get("property_ids") # Optional filter from report params

    if not owner_id or not report_id:
        logger.error("[Background] Missing owner_id or report_id for property performance generation.")
        return None

    logger.info(f"[Background] Generating Property Performance CSV for owner {owner_id} from {start_date} to {end_date}")

    try:
        # --- Fetch Properties --- 
        properties = await properties_db.get_properties(db_client=supabase_client, user_id=owner_id)
        if property_ids_filter:
            properties = [p for p in properties if p['id'] in property_ids_filter]

        if not properties:
            logger.warning(f"[Background] No properties found for owner {owner_id} matching filters.")
            # Generate an empty report? Or fail?
            # Let's generate an empty CSV for now.
            properties = []

        # --- Calculate Metrics per Property --- 
        performance_data = []
        total_days_in_period = (end_date - start_date).days + 1

        for prop in properties:
            prop_id = prop.get('id')
            prop_name = prop.get('property_name', 'N/A')

            # Fetch Payments (Income)
            prop_payments = await payment_db.get_payments(
                owner_id=owner_id, property_id=prop_id, 
                start_date=start_date.isoformat(), end_date=end_date.isoformat(), 
                status='paid'
            )
            prop_income = sum(p.get('amount', 0) for p in prop_payments)

            # Fetch Maintenance (Expenses)
            prop_maintenance = await maintenance_db.get_maintenance_requests(
                owner_id=owner_id, property_id=prop_id, 
                start_date=start_date.isoformat(), end_date=end_date.isoformat()
            )
            # Consider only *completed* maintenance within the period for expenses?
            # Or all requests created within the period? Let's use cost from all for now.
            prop_maintenance_cost = sum(m.get('cost', 0) or 0 for m in prop_maintenance)
            prop_expenses = prop_maintenance_cost # Add other expense types later
            prop_net_income = prop_income - prop_expenses

            # Calculate Occupancy (Simplified based on linked tenants' active period)
            # This assumes property_tenants table holds start/end dates of tenancy
            prop_links = await tenants_db.get_property_links_for_property(property_id=prop_id)
            occupied_days = 0
            for link in prop_links:
                 # Use link start/end dates
                 link_start = datetime.fromisoformat(link['start_date']).date()
                 # Handle ongoing leases (end_date is None)
                 link_end = datetime.fromisoformat(link['end_date']).date() if link.get('end_date') else end_date

                 # Calculate overlap between link period and report period
                 overlap_start = max(link_start, start_date)
                 overlap_end = min(link_end, end_date)
                
                 if overlap_end >= overlap_start:
                     occupied_days += (overlap_end - overlap_start).days + 1
            
            # Basic occupancy rate (consider number of units if applicable)
            occupancy_rate = (occupied_days / total_days_in_period) * 100 if total_days_in_period > 0 else 0
            occupancy_rate = min(occupancy_rate, 100) # Cap at 100%

            performance_data.append({
                "property_id": prop_id,
                "property_name": prop_name,
                "total_income": prop_income,
                "total_expenses": prop_expenses,
                "maintenance_cost": prop_maintenance_cost,
                "net_income": prop_net_income,
                "occupied_days": occupied_days,
                "total_days": total_days_in_period,
                "occupancy_rate_percent": round(occupancy_rate, 2)
            })

        # --- Generate CSV Content --- 
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(["Property Performance Report"])
        writer.writerow(["Period:", f"{start_date.isoformat()} to {end_date.isoformat()}"])
        writer.writerow(["Generated At:", datetime.utcnow().isoformat()])
        writer.writerow([]) # Spacer

        # Data Section
        if performance_data:
            headers = performance_data[0].keys()
            writer.writerow(headers)
            for row_data in performance_data:
                 writer.writerow(row_data.values())
        else:
             writer.writerow(["No property data available for the selected criteria."])

        report_content_bytes = output.getvalue().encode('utf-8')
        output.close()

        # --- Upload to Storage --- 
        file_name = f"property_performance_{report_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
        bucket_name = "reports"
        file_path = f"{owner_id}/{report_id}/{file_name}"

        try:
            supabase_storage = supabase_client.storage
            response = await supabase_storage.from_(bucket_name).upload(
                file=io.BytesIO(report_content_bytes),
                path=file_path,
                file_options={"content-type": "text/csv", "upsert": "true"}
            )
            public_url_response = supabase_storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"[Background] Generated report URL for {report_id}: {public_url_response}")
            return public_url_response

        except Exception as storage_error:
            logger.error(f"[Background] Failed to upload report {report_id} to storage: {storage_error}", exc_info=True)
            return None

    except Exception as e:
        logger.error(f"[Background] Error during property performance generation for report {report_id}: {e}", exc_info=True)
        return None

async def generate_financial_summary_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a financial summary report (income, expenses).
    Uploads the result as a CSV file to storage.
    """
    owner_id = report.get("owner_id")
    report_id = report.get("id")
    if not owner_id or not report_id:
        logger.error("[Background] Missing owner_id or report_id for financial summary generation.")
        return None

    logger.info(f"[Background] Generating Financial Summary CSV for owner {owner_id} from {start_date} to {end_date}")

    try:
        # --- Fetch Data --- 
        # Note: Using direct DB calls here assuming services might not yet exist or 
        #       for direct data access required by reporting. Adjust if services are preferred.
        # TODO: Ensure db modules/functions exist and support date filtering correctly
        payments = await payment_service.get_payments(owner_id=owner_id, start_date=start_date.isoformat(), end_date=end_date.isoformat(), status='paid')
        maintenance_requests = await maintenance_service.get_maintenance_requests(owner_id=owner_id, start_date=start_date.isoformat(), end_date=end_date.isoformat())

        # --- Calculate Summary --- 
        total_income = sum(p.get('amount', 0) for p in payments)
        total_maintenance_cost = sum(m.get('cost', 0) or 0 for m in maintenance_requests)
        total_expenses = total_maintenance_cost
        net_income = total_income - total_expenses

        # --- Generate CSV Content --- 
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(["Financial Summary Report"])
        writer.writerow(["Period:", f"{start_date.isoformat()} to {end_date.isoformat()}"])
        writer.writerow(["Generated At:", datetime.utcnow().isoformat()])
        writer.writerow([]) # Spacer

        # Summary Section
        writer.writerow(["Metric", "Amount"])
        writer.writerow(["Total Income", total_income])
        writer.writerow(["Total Expenses", total_expenses])
        writer.writerow([" - Maintenance", total_maintenance_cost])
        # Add rows for other expense types here
        writer.writerow(["Net Income", net_income])
        writer.writerow([]) # Spacer

        # Details Section (Optional)
        writer.writerow(["Income Details (Paid Payments)"])
        writer.writerow(["Payment ID", "Date", "Amount", "Tenant", "Property"])
        for p in payments:
             writer.writerow([
                 p.get('id'), 
                 p.get('payment_date'), 
                 p.get('amount'),
                 p.get('tenant_details', {}).get('name', 'N/A'), # Assumes tenant_details join
                 p.get('property_details', {}).get('property_name', 'N/A') # Assumes property_details join
             ])
        writer.writerow([]) # Spacer

        writer.writerow(["Expense Details (Maintenance)"])
        writer.writerow(["Request ID", "Date Created", "Cost", "Title", "Property"])
        for m in maintenance_requests:
            writer.writerow([
                m.get('id'),
                m.get('created_at'),
                m.get('cost', 0),
                m.get('title'),
                m.get('property_id') # TODO: Fetch property name if needed
            ])

        report_content_bytes = output.getvalue().encode('utf-8')
        output.close()

        # --- Upload to Storage --- 
        file_name = f"financial_summary_{report_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
        bucket_name = "reports"
        file_path = f"{owner_id}/{report_id}/{file_name}"

        try:
            supabase_storage = supabase_client.storage
            response = await supabase_storage.from_(bucket_name).upload(
                file=io.BytesIO(report_content_bytes),
                path=file_path,
                file_options={"content-type": "text/csv", "upsert": "true"}
            )
            logger.debug(f"[Background] Supabase storage upload response: {response}")

            # Get public URL
            # Note: Ensure the bucket has appropriate access policies for public URLs
            public_url_response = supabase_storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"[Background] Generated report URL for {report_id}: {public_url_response}")
            return public_url_response
        
        except Exception as storage_error:
            logger.error(f"[Background] Failed to upload report {report_id} to storage: {storage_error}", exc_info=True)
            return None

    except Exception as e:
        logger.error(f"[Background] Error during financial summary generation for report {report_id}: {e}", exc_info=True)
        return None

async def generate_maintenance_analysis_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a maintenance analysis report.
    Uploads the result as a CSV file to storage.
    """
    owner_id = report.get("owner_id")
    report_id = report.get("id")
    property_ids_filter = report.get("parameters", {}).get("property_ids") # Optional filter

    if not owner_id or not report_id:
        logger.error("[Background] Missing owner_id or report_id for maintenance analysis generation.")
        return None

    logger.info(f"[Background] Generating Maintenance Analysis CSV for owner {owner_id} from {start_date} to {end_date}")

    try:
        # --- Fetch Data --- 
        # Fetch all requests in the period for the owner
        # Apply property filter if specified
        all_requests = []
        if property_ids_filter:
             for prop_id in property_ids_filter:
                 requests = await maintenance_db.get_maintenance_requests(
                     owner_id=owner_id, property_id=prop_id, 
                     start_date=start_date.isoformat(), end_date=end_date.isoformat()
                 )
                 all_requests.extend(requests)
        else:
             all_requests = await maintenance_db.get_maintenance_requests(
                 owner_id=owner_id, 
                 start_date=start_date.isoformat(), end_date=end_date.isoformat()
             )

        # --- Analyze Data --- 
        total_requests = len(all_requests)
        status_counts = {'pending': 0, 'in_progress': 0, 'completed': 0, 'cancelled': 0, 'other': 0}
        category_counts = {}
        total_cost = 0
        total_resolution_days = 0
        completed_request_count = 0
        property_request_counts = {}

        for req in all_requests:
            status = req.get('status', 'other').lower()
            if status in status_counts:
                status_counts[status] += 1
            else:
                status_counts['other'] += 1

            category = req.get('category', 'Uncategorized')
            category_counts[category] = category_counts.get(category, 0) + 1

            cost = req.get('cost', 0) or 0
            total_cost += cost

            prop_id = req.get('property_id', 'Unknown Property')
            property_request_counts[prop_id] = property_request_counts.get(prop_id, 0) + 1

            if status == 'completed' and req.get('created_at') and req.get('completed_at'):
                try:
                    created_dt = datetime.fromisoformat(req['created_at'])
                    completed_dt = datetime.fromisoformat(req['completed_at'])
                    resolution_time = completed_dt - created_dt
                    total_resolution_days += resolution_time.total_seconds() / (60*60*24) # Convert to days
                    completed_request_count += 1
                except (ValueError, TypeError):
                     logger.warning(f"Could not parse dates for resolution time calculation on request {req.get('id')}")

        avg_resolution_days = (total_resolution_days / completed_request_count) if completed_request_count > 0 else 0

        # --- Generate CSV Content --- 
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Maintenance Analysis Report"])
        writer.writerow(["Period:", f"{start_date.isoformat()} to {end_date.isoformat()}"])
        writer.writerow(["Generated At:", datetime.utcnow().isoformat()])
        writer.writerow([])

        writer.writerow(["Summary Metrics"])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Requests", total_requests])
        writer.writerow(["Total Cost", total_cost])
        writer.writerow(["Avg. Resolution Time (Days)", round(avg_resolution_days, 2) if avg_resolution_days else "N/A"])
        writer.writerow([])

        writer.writerow(["Requests by Status"])
        writer.writerow(["Status", "Count"])
        for status, count in status_counts.items():
             writer.writerow([status.capitalize(), count])
        writer.writerow([])

        writer.writerow(["Requests by Category"])
        writer.writerow(["Category", "Count"])
        # Sort categories by count descending
        sorted_categories = sorted(category_counts.items(), key=lambda item: item[1], reverse=True)
        for category, count in sorted_categories:
             writer.writerow([category, count])
        writer.writerow([])

        writer.writerow(["Requests by Property"])
        writer.writerow(["Property ID", "Count"])
        # Sort properties by count descending
        sorted_properties = sorted(property_request_counts.items(), key=lambda item: item[1], reverse=True)
        for prop_id, count in sorted_properties:
            # TODO: Could fetch property name here for better readability
            writer.writerow([prop_id, count])
        writer.writerow([])

        writer.writerow(["Request Details"])
        # Define headers based on available data in maintenance_requests table
        detail_headers = ["ID", "Created At", "Status", "Category", "Property ID", "Cost", "Completed At", "Resolution Days"]
        writer.writerow(detail_headers)
        for req in all_requests:
            res_days = "N/A"
            if req.get('status', '').lower() == 'completed' and req.get('created_at') and req.get('completed_at'):
                 try:
                      created_dt = datetime.fromisoformat(req['created_at'])
                      completed_dt = datetime.fromisoformat(req['completed_at'])
                      res_days = round((completed_dt - created_dt).total_seconds() / (60*60*24), 2)
                 except: pass # Ignore parsing errors here, already warned above

            writer.writerow([
                req.get('id'),
                req.get('created_at'),
                req.get('status'),
                req.get('category'),
                req.get('property_id'),
                req.get('cost'),
                req.get('completed_at'),
                res_days
            ])

        report_content_bytes = output.getvalue().encode('utf-8')
        output.close()

        # --- Upload to Storage --- 
        file_name = f"maintenance_analysis_{report_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
        bucket_name = "reports"
        file_path = f"{owner_id}/{report_id}/{file_name}"

        try:
            supabase_storage = supabase_client.storage
            response = await supabase_storage.from_(bucket_name).upload(
                file=io.BytesIO(report_content_bytes),
                path=file_path,
                file_options={"content-type": "text/csv", "upsert": "true"}
            )
            public_url_response = supabase_storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"[Background] Generated report URL for {report_id}: {public_url_response}")
            return public_url_response

        except Exception as storage_error:
            logger.error(f"[Background] Failed to upload report {report_id} to storage: {storage_error}", exc_info=True)
            return None

    except Exception as e:
        logger.error(f"[Background] Error during maintenance analysis generation for report {report_id}: {e}", exc_info=True)
        return None

async def generate_rent_collection_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a rent collection analysis report.
    Uploads the result as a CSV file to storage.
    """
    owner_id = report.get("owner_id")
    report_id = report.get("id")
    property_ids_filter = report.get("parameters", {}).get("property_ids") # Optional filter

    if not owner_id or not report_id:
        logger.error("[Background] Missing owner_id or report_id for rent collection generation.")
        return None

    logger.info(f"[Background] Generating Rent Collection CSV for owner {owner_id} from {start_date} to {end_date}")

    try:
        # --- Fetch Data --- 
        # Fetch all relevant payments (rent type) for the owner/properties in the period
        # Note: We fetch all statuses initially to calculate amounts due vs paid.
        all_payments = []
        if property_ids_filter:
            for prop_id in property_ids_filter:
                payments = await payment_db.get_payments(
                    owner_id=owner_id, property_id=prop_id,
                    payment_type='rent',
                    start_date=start_date.isoformat(), end_date=end_date.isoformat()
                )
                all_payments.extend(payments)
        else:
            all_payments = await payment_db.get_payments(
                owner_id=owner_id,
                payment_type='rent',
                start_date=start_date.isoformat(), end_date=end_date.isoformat()
            )

        # --- Analyze Data --- 
        total_due = 0
        total_collected = 0
        total_pending = 0
        total_overdue = 0
        count_paid = 0
        count_pending = 0
        count_overdue = 0
        count_partially_paid = 0
        property_collection_rates = {}

        for p in all_payments:
            due_amount = p.get('amount', 0)
            paid_amount = p.get('amount_paid', 0) or 0 # Amount actually paid
            status = p.get('status')
            prop_id = p.get('property_id')

            total_due += due_amount
            total_collected += paid_amount

            if status == 'paid':
                count_paid += 1
            elif status == 'pending':
                count_pending += 1
                total_pending += (due_amount - paid_amount)
            elif status == 'overdue':
                count_overdue += 1
                total_overdue += (due_amount - paid_amount)
            elif status == 'partially_paid':
                 count_partially_paid += 1
                 # Treat remaining amount based on due date relative to end_date?
                 # For simplicity, let's add remaining due to pending/overdue based on current status idea
                 due_date = datetime.fromisoformat(p['due_date']).date() if p.get('due_date') else None
                 if due_date and due_date > end_date:
                      total_pending += (due_amount - paid_amount)
                 else:
                     total_overdue += (due_amount - paid_amount) # Assume overdue if partially paid and due date passed
            
            # Property-level aggregation
            if prop_id not in property_collection_rates:
                 property_collection_rates[prop_id] = {'due': 0, 'collected': 0}
            property_collection_rates[prop_id]['due'] += due_amount
            property_collection_rates[prop_id]['collected'] += paid_amount

        collection_rate = (total_collected / total_due) * 100 if total_due > 0 else 0

        # --- Generate CSV Content --- 
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Rent Collection Report"])
        writer.writerow(["Period:", f"{start_date.isoformat()} to {end_date.isoformat()}"])
        writer.writerow(["Generated At:", datetime.utcnow().isoformat()])
        writer.writerow([])

        writer.writerow(["Overall Summary"])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Rent Due", total_due])
        writer.writerow(["Total Rent Collected", total_collected])
        writer.writerow(["Outstanding (Pending)", total_pending])
        writer.writerow(["Outstanding (Overdue)", total_overdue])
        writer.writerow(["Overall Collection Rate (%)", round(collection_rate, 2)])
        writer.writerow(["# Payments Paid", count_paid])
        writer.writerow(["# Payments Partially Paid", count_partially_paid])
        writer.writerow(["# Payments Pending", count_pending])
        writer.writerow(["# Payments Overdue", count_overdue])
        writer.writerow([])

        writer.writerow(["Collection by Property"])
        writer.writerow(["Property ID", "Total Due", "Total Collected", "Collection Rate (%)"])
        for prop_id, data in property_collection_rates.items():
            rate = (data['collected'] / data['due']) * 100 if data['due'] > 0 else 0
            # TODO: Fetch property name for better readability
            writer.writerow([
                 prop_id, 
                 data['due'], 
                 data['collected'],
                 round(rate, 2)
            ])
        writer.writerow([])

        writer.writerow(["Payment Details"])
        detail_headers = ["Payment ID", "Due Date", "Status", "Amount Due", "Amount Paid", "Tenant", "Property ID"]
        writer.writerow(detail_headers)
        # Sort payments by due date for detail list
        sorted_payments = sorted(all_payments, key=lambda x: x.get('due_date', ''))
        for p in sorted_payments:
             writer.writerow([
                 p.get('id'),
                 p.get('due_date'),
                 p.get('status'),
                 p.get('amount'),
                 p.get('amount_paid'),
                 p.get('tenant_details', {}).get('name', 'N/A'), # Assumes join
                 p.get('property_id')
             ])

        report_content_bytes = output.getvalue().encode('utf-8')
        output.close()

        # --- Upload to Storage --- 
        file_name = f"rent_collection_{report_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
        bucket_name = "reports"
        file_path = f"{owner_id}/{report_id}/{file_name}"

        try:
            supabase_storage = supabase_client.storage
            response = await supabase_storage.from_(bucket_name).upload(
                file=io.BytesIO(report_content_bytes),
                path=file_path,
                file_options={"content-type": "text/csv", "upsert": "true"}
            )
            public_url_response = supabase_storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"[Background] Generated report URL for {report_id}: {public_url_response}")
            return public_url_response

        except Exception as storage_error:
            logger.error(f"[Background] Failed to upload report {report_id} to storage: {storage_error}", exc_info=True)
            return None

    except Exception as e:
        logger.error(f"[Background] Error during rent collection generation for report {report_id}: {e}", exc_info=True)
        return None

async def generate_tenant_history_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate a tenant history report showing tenants and their lease periods.
    Uploads the result as a CSV file to storage.
    """
    owner_id = report.get("owner_id")
    report_id = report.get("id")
    property_ids_filter = report.get("parameters", {}).get("property_ids") # Optional filter

    if not owner_id or not report_id:
        logger.error("[Background] Missing owner_id or report_id for tenant history generation.")
        return None

    logger.info(f"[Background] Generating Tenant History CSV for owner {owner_id} from {start_date} to {end_date}")

    try:
        # --- Fetch Data --- 
        # Get tenants linked to the owner's properties (or filtered properties)
        # We can reuse get_tenants_for_owner db function, but might need all tenants, not paginated
        # Alternative: Fetch links first, then tenants.

        tenant_history = []
        links = []

        # Fetch relevant property_tenant links
        if property_ids_filter:
            for prop_id in property_ids_filter:
                # Check ownership implicitly by fetching links via owner properties
                prop_links = await tenants_db.get_property_links_for_property_within_dates(
                     property_id=prop_id, 
                     start_date=start_date,
                     end_date=end_date
                )
                # TODO: Ensure owner owns this property before adding links?
                # The get_tenants_for_owner does this implicitly. Maybe adapt that?
                # For now, assuming get_property_links_for_property_within_dates is sufficient if RLS is set.
                links.extend(prop_links)
        else:
             # Get all properties owned by the user first
             properties = await properties_db.get_properties(db_client=supabase_client, user_id=owner_id)
             for prop in properties:
                  prop_links = await tenants_db.get_property_links_for_property_within_dates(
                       property_id=prop['id'], 
                       start_date=start_date,
                       end_date=end_date
                  )
                  links.extend(prop_links)

        # Fetch tenant details for unique tenant IDs in the links
        tenant_ids = list(set(link['tenant_id'] for link in links))
        tenants_map = {}
        for t_id in tenant_ids:
             tenant_data = await tenants_db.get_tenant_by_id(tenant_id=t_id)
             if tenant_data:
                  tenants_map[t_id] = tenant_data
        
        # Fetch property details for unique property IDs
        property_ids = list(set(link['property_id'] for link in links))
        properties_map = {}
        for p_id in property_ids:
             prop_data = await properties_db.get_property_by_id(db_client=supabase_client, property_id=p_id)
             if prop_data:
                 properties_map[p_id] = prop_data

        # --- Structure Report Data --- 
        for link in links:
            tenant_id = link.get('tenant_id')
            prop_id = link.get('property_id')
            tenant_info = tenants_map.get(tenant_id)
            prop_info = properties_map.get(prop_id)

            if tenant_info and prop_info:
                tenant_history.append({
                    "tenant_id": tenant_id,
                    "tenant_name": tenant_info.get('name', 'N/A'),
                    "tenant_email": tenant_info.get('email'),
                    "property_id": prop_id,
                    "property_name": prop_info.get('property_name', 'N/A'),
                    "unit_number": link.get('unit_number'),
                    "tenancy_start_date": link.get('start_date'),
                    "tenancy_end_date": link.get('end_date'),
                    # Add other relevant fields from tenant or link if needed
                })

        # --- Generate CSV Content --- 
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Tenant History Report"])
        writer.writerow(["Period:", f"{start_date.isoformat()} to {end_date.isoformat()}"])
        writer.writerow(["Generated At:", datetime.utcnow().isoformat()])
        writer.writerow([])

        if tenant_history:
            headers = tenant_history[0].keys()
            writer.writerow(headers)
            # Sort history? e.g., by tenant name then start date
            sorted_history = sorted(tenant_history, key=lambda x: (x.get('tenant_name', ''), x.get('tenancy_start_date', '')))
            for row_data in sorted_history:
                 writer.writerow(row_data.values())
        else:
             writer.writerow(["No tenant history found for the selected criteria."])

        report_content_bytes = output.getvalue().encode('utf-8')
        output.close()

        # --- Upload to Storage --- 
        file_name = f"tenant_history_{report_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
        bucket_name = "reports"
        file_path = f"{owner_id}/{report_id}/{file_name}"

        try:
            supabase_storage = supabase_client.storage
            response = await supabase_storage.from_(bucket_name).upload(
                file=io.BytesIO(report_content_bytes),
                path=file_path,
                file_options={"content-type": "text/csv", "upsert": "true"}
            )
            public_url_response = supabase_storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"[Background] Generated report URL for {report_id}: {public_url_response}")
            return public_url_response

        except Exception as storage_error:
            logger.error(f"[Background] Failed to upload report {report_id} to storage: {storage_error}", exc_info=True)
            return None

    except Exception as e:
        logger.error(f"[Background] Error during tenant history generation for report {report_id}: {e}", exc_info=True)
        return None

async def generate_occupancy_rate_report(report: Dict[str, Any], start_date: date, end_date: date) -> Optional[str]:
    """
    Generate an occupancy rate report for specified properties or all owner properties.
    Uploads the result as a CSV file to storage.
    """
    owner_id = report.get("owner_id")
    report_id = report.get("id")
    property_ids_filter = report.get("parameters", {}).get("property_ids") # Optional filter

    if not owner_id or not report_id:
        logger.error("[Background] Missing owner_id or report_id for occupancy rate generation.")
        return None

    logger.info(f"[Background] Generating Occupancy Rate CSV for owner {owner_id} from {start_date} to {end_date}")

    try:
        # --- Fetch Properties --- 
        properties = await properties_db.get_properties(db_client=supabase_client, user_id=owner_id)
        if property_ids_filter:
            properties = [p for p in properties if p['id'] in property_ids_filter]

        if not properties:
            logger.warning(f"[Background] No properties found for owner {owner_id} matching filters for occupancy report.")
            properties = []

        # --- Calculate Occupancy per Property --- 
        occupancy_data = []
        total_property_days_in_period = 0
        total_occupied_days = 0
        total_days_in_period = (end_date - start_date).days + 1

        for prop in properties:
            prop_id = prop.get('id')
            prop_name = prop.get('property_name', 'N/A')
            # Assuming single unit per property for simplicity, adjust if properties have multiple units
            property_days_in_period = total_days_in_period 

            # Fetch relevant links for this property within the date range
            prop_links = await tenants_db.get_property_links_for_property_within_dates(
                property_id=prop_id, 
                start_date=start_date, 
                end_date=end_date
            )
            
            prop_occupied_days = 0
            for link in prop_links:
                 link_start = datetime.fromisoformat(link['start_date']).date()
                 link_end = datetime.fromisoformat(link['end_date']).date() if link.get('end_date') else end_date
                 overlap_start = max(link_start, start_date)
                 overlap_end = min(link_end, end_date)
                 if overlap_end >= overlap_start:
                     prop_occupied_days += (overlap_end - overlap_start).days + 1
            
            # Ensure occupied days don't exceed total days in period for this property/unit
            prop_occupied_days = min(prop_occupied_days, property_days_in_period)
            prop_occupancy_rate = (prop_occupied_days / property_days_in_period) * 100 if property_days_in_period > 0 else 0

            occupancy_data.append({
                "property_id": prop_id,
                "property_name": prop_name,
                "occupied_days": prop_occupied_days,
                "total_days_in_period": property_days_in_period,
                "occupancy_rate_percent": round(prop_occupancy_rate, 2)
            })

            total_property_days_in_period += property_days_in_period
            total_occupied_days += prop_occupied_days

        overall_occupancy_rate = (total_occupied_days / total_property_days_in_period) * 100 if total_property_days_in_period > 0 else 0

        # --- Generate CSV Content --- 
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Occupancy Rate Report"])
        writer.writerow(["Period:", f"{start_date.isoformat()} to {end_date.isoformat()}"])
        writer.writerow(["Generated At:", datetime.utcnow().isoformat()])
        writer.writerow([])

        writer.writerow(["Overall Occupancy"])
        writer.writerow(["Metric", "Value"])
        writer.writerow(["Total Occupied Days (All Properties)", total_occupied_days])
        writer.writerow(["Total Possible Days (All Properties)", total_property_days_in_period])
        writer.writerow(["Overall Occupancy Rate (%)", round(overall_occupancy_rate, 2)])
        writer.writerow([])

        writer.writerow(["Occupancy by Property"])
        if occupancy_data:
            headers = occupancy_data[0].keys()
            writer.writerow(headers)
            for row_data in occupancy_data:
                 writer.writerow(row_data.values())
        else:
             writer.writerow(["No property data available for the selected criteria."])

        report_content_bytes = output.getvalue().encode('utf-8')
        output.close()

        # --- Upload to Storage --- 
        file_name = f"occupancy_rate_{report_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
        bucket_name = "reports"
        file_path = f"{owner_id}/{report_id}/{file_name}"

        try:
            supabase_storage = supabase_client.storage
            response = await supabase_storage.from_(bucket_name).upload(
                file=io.BytesIO(report_content_bytes),
                path=file_path,
                file_options={"content-type": "text/csv", "upsert": "true"}
            )
            public_url_response = supabase_storage.from_(bucket_name).get_public_url(file_path)
            logger.info(f"[Background] Generated report URL for {report_id}: {public_url_response}")
            return public_url_response

        except Exception as storage_error:
            logger.error(f"[Background] Failed to upload report {report_id} to storage: {storage_error}", exc_info=True)
            return None

    except Exception as e:
        logger.error(f"[Background] Error during occupancy rate generation for report {report_id}: {e}", exc_info=True)
        return None 