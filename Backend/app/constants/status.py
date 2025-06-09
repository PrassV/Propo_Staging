"""
Constants for status values used throughout the application.
This ensures consistent usage across the codebase.
"""

# Unit Status Values
UNIT_STATUS_VACANT = "Vacant"
UNIT_STATUS_OCCUPIED = "Occupied"
UNIT_STATUS_MAINTENANCE = "Under Maintenance"

# Tenant Status Values
TENANT_STATUS_ACTIVE = "active"
TENANT_STATUS_INACTIVE = "inactive"
TENANT_STATUS_UNASSIGNED = "unassigned"

# Lease/Agreement Status Values
AGREEMENT_STATUS_DRAFT = "draft"
AGREEMENT_STATUS_ACTIVE = "active"
AGREEMENT_STATUS_EXPIRED = "expired"
AGREEMENT_STATUS_TERMINATED = "terminated"

# Payment Status Values
PAYMENT_STATUS_PENDING = "pending"
PAYMENT_STATUS_PAID = "paid"
PAYMENT_STATUS_PARTIALLY_PAID = "partially_paid"
PAYMENT_STATUS_OVERDUE = "overdue"
PAYMENT_STATUS_CANCELLED = "cancelled"

# Maintenance Request Status Values
MAINTENANCE_STATUS_NEW = "new"
MAINTENANCE_STATUS_IN_PROGRESS = "in_progress"
MAINTENANCE_STATUS_COMPLETED = "completed"
MAINTENANCE_STATUS_REJECTED = "rejected" 