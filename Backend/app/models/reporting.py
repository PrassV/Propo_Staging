from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
from enum import Enum

class ReportType(str, Enum):
    PROPERTY_PERFORMANCE = "property_performance"
    TENANT_HISTORY = "tenant_history"
    FINANCIAL_SUMMARY = "financial_summary"
    MAINTENANCE_ANALYSIS = "maintenance_analysis"
    RENT_COLLECTION = "rent_collection"
    OCCUPANCY_RATE = "occupancy_rate"
    CUSTOM = "custom"

class ReportFormat(str, Enum):
    PDF = "pdf"
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"

class ReportPeriod(str, Enum):
    LAST_MONTH = "last_month"
    LAST_QUARTER = "last_quarter"
    LAST_YEAR = "last_year"
    YEAR_TO_DATE = "year_to_date"
    CUSTOM = "custom"

class ReportStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class ReportBase(BaseModel):
    report_type: ReportType
    report_format: ReportFormat
    report_period: ReportPeriod
    report_name: str
    description: Optional[str] = None
    custom_start_date: Optional[date] = None
    custom_end_date: Optional[date] = None
    filter_property_ids: Optional[List[str]] = None
    filter_tenant_ids: Optional[List[str]] = None
    additional_filters: Optional[Dict[str, Any]] = None

class ReportCreate(ReportBase):
    pass

class ReportUpdate(BaseModel):
    report_name: Optional[str] = None
    description: Optional[str] = None
    report_format: Optional[ReportFormat] = None
    report_period: Optional[ReportPeriod] = None
    custom_start_date: Optional[date] = None
    custom_end_date: Optional[date] = None
    filter_property_ids: Optional[List[str]] = None
    filter_tenant_ids: Optional[List[str]] = None
    additional_filters: Optional[Dict[str, Any]] = None
    status: Optional[ReportStatus] = None

class Report(ReportBase):
    id: str
    owner_id: str
    status: ReportStatus
    file_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ReportSchedule(BaseModel):
    id: str
    report_id: str
    owner_id: str
    frequency: str  # "daily", "weekly", "monthly", "quarterly"
    day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday (for weekly)
    day_of_month: Optional[int] = None  # 1-31 (for monthly)
    month_of_quarter: Optional[int] = None  # 1-3 (for quarterly)
    active: bool = True
    recipient_emails: List[str]
    next_run_date: datetime
    last_run_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ReportTemplate(BaseModel):
    id: str
    owner_id: str
    template_name: str
    report_type: ReportType
    template_config: Dict[str, Any]
    is_default: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Data models for different report types
class PropertyPerformanceData(BaseModel):
    property_id: str
    property_name: str
    total_income: float
    total_expenses: float
    net_income: float
    occupancy_rate: float
    avg_rent: float
    rent_growth: float
    maintenance_expenses: float
    roi: float
    
class FinancialSummaryData(BaseModel):
    total_revenue: float
    total_expenses: float
    net_income: float
    total_rent_collected: float
    total_rent_outstanding: float
    total_security_deposits: float
    expense_categories: Dict[str, float]
    revenue_categories: Dict[str, float]
    monthly_breakdown: List[Dict[str, Union[str, float]]]
    
class MaintenanceAnalysisData(BaseModel):
    total_requests: int
    resolved_requests: int
    average_resolution_time_days: float
    total_cost: float
    requests_by_category: Dict[str, int]
    requests_by_priority: Dict[str, int]
    requests_by_property: Dict[str, int]
    top_vendors: List[Dict[str, Any]]
    
class RentCollectionData(BaseModel):
    total_rent_due: float
    total_rent_collected: float
    collection_rate: float
    on_time_payments: int
    late_payments: int
    outstanding_payments: int
    collection_by_property: Dict[str, Dict[str, float]]
    collection_trend: List[Dict[str, Any]]

# Classes needed by the API
class FinancialSummary(BaseModel):
    period: str
    total_revenue: float
    total_expenses: float
    net_income: float
    cash_flow: float
    
class ExpenseReport(BaseModel):
    period: str
    categories: Dict[str, float]
    total: float
    
class OccupancyReport(BaseModel):
    period: str
    rate: float
    total_units: int
    occupied_units: int
    vacant_units: int
    
class ReportDateRange(BaseModel):
    start_date: date
    end_date: date 