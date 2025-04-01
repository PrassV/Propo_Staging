from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, BackgroundTasks
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.models.reporting import (
    ReportCreate,
    ReportUpdate,
    Report,
    ReportSchedule,
    FinancialSummary, ExpenseReport, OccupancyReport, ReportDateRange
)
from app.services import reporting_service
from app.config.auth import get_current_user

router = APIRouter()

# Response models
class ReportResponse(BaseModel):
    report: Dict[str, Any]
    message: str = "Success"

class ReportsResponse(BaseModel):
    reports: List[Dict[str, Any]]
    count: int
    message: str = "Success"

class ReportScheduleResponse(BaseModel):
    schedule: Dict[str, Any]
    message: str = "Success"

class ReportSchedulesResponse(BaseModel):
    schedules: List[Dict[str, Any]]
    count: int
    message: str = "Success"

@router.get("/", response_model=ReportsResponse)
async def get_reports(
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get reports for the current user.
    
    Args:
        report_type: Optional filter by report type
        current_user: The current authenticated user
        
    Returns:
        List of reports
    """
    reports = await reporting_service.get_reports(current_user["id"], report_type)
    
    return {
        "reports": reports,
        "count": len(reports),
        "message": "Reports retrieved successfully"
    }

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str = Path(..., description="The report ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific report by ID.
    
    Args:
        report_id: The report ID
        current_user: The current authenticated user
        
    Returns:
        Report details
    """
    report = await reporting_service.get_report(report_id)
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    # Check if the user owns the report
    if report["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this report"
        )
    
    return {
        "report": report,
        "message": "Report retrieved successfully"
    }

@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new report and trigger background generation.
    """
    report = await reporting_service.create_report(report_data, current_user["id"], background_tasks)
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create report entry"
        )
    
    return {
        "report": report,
        "message": "Report creation initiated successfully. Generation running in background."
    }

@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_data: ReportUpdate,
    background_tasks: BackgroundTasks,
    report_id: str = Path(..., description="The report ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a report. If status is set to PENDING, triggers regeneration.
    """
    # Check if the report exists and belongs to the user
    existing_report = await reporting_service.get_report(report_id)
    
    if not existing_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    if existing_report["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this report"
        )
    
    # Pass background_tasks to the service function
    updated_report = await reporting_service.update_report(report_id, report_data, background_tasks)
    
    if not updated_report:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update report"
        )
    
    return {
        "report": updated_report,
        "message": "Report updated successfully. Regeneration may be running in background if status was set to pending."
    }

@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
async def delete_report(
    report_id: str = Path(..., description="The report ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a report.
    
    Args:
        report_id: The report ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # Check if the report exists and belongs to the user
    existing_report = await reporting_service.get_report(report_id)
    
    if not existing_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    if existing_report["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this report"
        )
    
    success = await reporting_service.delete_report(report_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete report"
        )
    
    return {
        "message": "Report deleted successfully"
    }

@router.post("/{report_id}/regenerate", response_model=ReportResponse)
async def regenerate_report(
    background_tasks: BackgroundTasks,
    report_id: str = Path(..., description="The report ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Regenerate a report using background tasks.
    """
    # Check if the report exists and belongs to the user
    existing_report = await reporting_service.get_report(report_id)
    
    if not existing_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    if existing_report["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to regenerate this report"
        )
    
    # Call a specific service function for regeneration might be cleaner
    # Or, just update status and let update_report handle the background task
    update_data = ReportUpdate(status="pending")
    # Pass background_tasks to the update function
    updated_report = await reporting_service.update_report(report_id, update_data, background_tasks)
    
    if not updated_report:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger report regeneration"
        )
    
    return {
        "report": updated_report,
        "message": "Report regeneration initiated successfully. Running in background."
    }

@router.get("/schedules", response_model=ReportSchedulesResponse)
async def get_report_schedules(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get report schedules for the current user.
    
    Args:
        current_user: The current authenticated user
        
    Returns:
        List of report schedules
    """
    schedules = await reporting_service.get_report_schedules(current_user["id"])
    
    return {
        "schedules": schedules,
        "count": len(schedules),
        "message": "Report schedules retrieved successfully"
    }

@router.post("/schedules", response_model=ReportScheduleResponse)
async def create_report_schedule(
    schedule_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new report schedule.
    
    Args:
        schedule_data: The schedule data
        current_user: The current authenticated user
        
    Returns:
        Created schedule
    """
    # Check if the user has access to the report
    report_id = schedule_data.get("report_id")
    if report_id:
        report = await reporting_service.get_report(report_id)
        if not report or report["owner_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to schedule this report"
            )
    
    schedule = await reporting_service.create_report_schedule(schedule_data, current_user["id"])
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create report schedule"
        )
    
    return {
        "schedule": schedule,
        "message": "Report schedule created successfully"
    }

@router.put("/schedules/{schedule_id}", response_model=ReportScheduleResponse)
async def update_report_schedule(
    schedule_data: Dict[str, Any],
    schedule_id: str = Path(..., description="The schedule ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a report schedule.
    
    Args:
        schedule_data: The updated schedule data
        schedule_id: The schedule ID
        current_user: The current authenticated user
        
    Returns:
        Updated schedule
    """
    # Check if the schedule exists and belongs to the user
    existing_schedule = await reporting_service.get_report_schedule(schedule_id)
    
    if not existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report schedule not found"
        )
    
    if existing_schedule["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this schedule"
        )
    
    updated_schedule = await reporting_service.update_report_schedule(schedule_id, schedule_data)
    
    if not updated_schedule:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update report schedule"
        )
    
    return {
        "schedule": updated_schedule,
        "message": "Report schedule updated successfully"
    }

@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_200_OK)
async def delete_report_schedule(
    schedule_id: str = Path(..., description="The schedule ID"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a report schedule.
    
    Args:
        schedule_id: The schedule ID
        current_user: The current authenticated user
        
    Returns:
        Success message
    """
    # Check if the schedule exists and belongs to the user
    existing_schedule = await reporting_service.get_report_schedule(schedule_id)
    
    if not existing_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report schedule not found"
        )
    
    if existing_schedule["owner_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this schedule"
        )
    
    success = await reporting_service.delete_report_schedule(schedule_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete report schedule"
        )
    
    return {
        "message": "Report schedule deleted successfully"
    } 