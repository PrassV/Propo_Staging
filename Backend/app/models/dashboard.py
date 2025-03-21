from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime, date

class PropertyStats(BaseModel):
    total_properties: int
    total_rented: int
    total_vacant: int
    total_under_maintenance: int
    occupancy_rate: float  # percentage of properties rented
    
class PropertyRevenue(BaseModel):
    monthly_rental_income: float
    yearly_rental_income: float
    average_rent_per_property: float
    total_security_deposits: float
    
class TenantStats(BaseModel):
    total_tenants: int
    upcoming_lease_expiries: int
    lease_renewals_last_90_days: int
    average_lease_duration: float  # in months
    
class MaintenanceStats(BaseModel):
    open_maintenance_requests: int
    resolved_maintenance_requests: int
    average_resolution_time: float  # in days
    maintenance_expense_current_month: float
    
class RentCollection(BaseModel):
    collected_current_month: float
    pending_current_month: float
    overdue_amount: float
    collection_rate: float  # percentage of rent collected
    
class MonthlyRevenue(BaseModel):
    month: date
    revenue: float
    expenses: float
    net_income: float
    
class DashboardSummary(BaseModel):
    property_stats: PropertyStats
    revenue: PropertyRevenue
    tenant_stats: TenantStats
    maintenance_stats: Optional[MaintenanceStats] = None
    rent_collection: RentCollection
    
class DashboardData(BaseModel):
    summary: DashboardSummary
    monthly_revenue: List[MonthlyRevenue]
    occupancy_history: List[Dict[str, float]]  # month -> percentage 