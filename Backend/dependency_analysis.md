# Dependency Analysis - Database Consolidation Impact

## Executive Summary

This document provides a comprehensive analysis of all services, functions, and components that will be affected by the database consolidation project. It identifies potential breaking changes and provides migration strategies for each affected component.

## Backend API Endpoints Analysis

### 1. Tenant-Related Endpoints

#### Affected Endpoints:
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/{id}` - Get tenant details
- `PUT /api/tenants/{id}` - Update tenant
- `DELETE /api/tenants/{id}` - Delete tenant

#### Current Rental Data Usage:
- **Reading rental data**: All endpoints currently read rental fields from tenants table
- **Writing rental data**: Create/Update endpoints write rental fields to tenants table

#### Migration Impact:
- **High Impact**: All tenant endpoints will need updates
- **Breaking Changes**: Rental data will no longer be stored in tenants table
- **Required Changes**: 
  - Remove rental field handling from tenant endpoints
  - Add lease creation/update logic for rental data
  - Update response schemas to exclude rental fields

### 2. Unit-Related Endpoints

#### Affected Endpoints:
- `GET /api/units` - List units
- `POST /api/units` - Create unit
- `GET /api/units/{id}` - Get unit details
- `PUT /api/units/{id}` - Update unit
- `DELETE /api/units/{id}` - Delete unit

#### Current Rental Data Usage:
- **Reading rental data**: Unit details include rent, deposit, dates
- **Writing rental data**: Create/Update endpoints write rental fields to units table

#### Migration Impact:
- **High Impact**: All unit endpoints will need updates
- **Breaking Changes**: Rental data will no longer be stored in units table
- **Required Changes**:
  - Remove rental field handling from unit endpoints
  - Add lease creation/update logic for rental data
  - Update response schemas to exclude rental fields

### 3. Property-Related Endpoints

#### Affected Endpoints:
- `GET /api/properties/{id}` - Get property details
- `GET /api/properties` - List properties

#### Current Rental Data Usage:
- **Reading rental data**: Property details may include aggregated rental data
- **Writing rental data**: None

#### Migration Impact:
- **Medium Impact**: Property endpoints may need updates
- **Required Changes**:
  - Update property aggregation logic to use leases table
  - Update response schemas if rental data is included

### 4. Lease-Related Endpoints

#### Affected Endpoints:
- `GET /api/leases` - List leases
- `POST /api/leases` - Create lease
- `GET /api/leases/{id}` - Get lease details
- `PUT /api/leases/{id}` - Update lease
- `DELETE /api/leases/{id}` - Delete lease

#### Current Rental Data Usage:
- **Reading rental data**: All lease endpoints read from leases table
- **Writing rental data**: Create/Update endpoints write to leases table

#### Migration Impact:
- **Low Impact**: Lease endpoints are already properly structured
- **Required Changes**:
  - Add new fields (rental_type, rental_frequency, maintenance_fee, advance_amount)
  - Update validation schemas
  - Update response schemas

## Backend Service Layer Analysis

### 1. Tenant Service (`tenant_service.py`)

#### Current Functions:
- `create_tenant()` - Creates tenant with rental data
- `update_tenant()` - Updates tenant including rental fields
- `get_tenant()` - Retrieves tenant with rental data
- `list_tenants()` - Lists tenants with rental information

#### Migration Impact:
- **High Impact**: All functions need updates
- **Required Changes**:
  - Remove rental field handling from tenant operations
  - Add lease creation/update logic for rental data
  - Update database queries to exclude rental fields

### 2. Unit Service (`unit_service.py`)

#### Current Functions:
- `create_unit()` - Creates unit with rental data
- `update_unit()` - Updates unit including rental fields
- `get_unit()` - Retrieves unit with rental data
- `list_units()` - Lists units with rental information

#### Migration Impact:
- **High Impact**: All functions need updates
- **Required Changes**:
  - Remove rental field handling from unit operations
  - Add lease creation/update logic for rental data
  - Update database queries to exclude rental fields

### 3. Property Service (`property_service.py`)

#### Current Functions:
- `get_property()` - Retrieves property with aggregated rental data
- `list_properties()` - Lists properties with rental summaries

#### Migration Impact:
- **Medium Impact**: Aggregation functions need updates
- **Required Changes**:
  - Update rental data aggregation to use leases table
  - Update database queries to join with leases table

### 4. Lease Service (`lease_service.py`)

#### Current Functions:
- `create_lease()` - Creates lease record
- `update_lease()` - Updates lease record
- `get_lease()` - Retrieves lease details
- `list_leases()` - Lists leases

#### Migration Impact:
- **Low Impact**: Functions need minor updates
- **Required Changes**:
  - Add new field handling (rental_type, rental_frequency, etc.)
  - Update validation logic
  - Update database queries to include new fields

## Database Layer Analysis

### 1. Tenant Database (`db/tenants.py`)

#### Current Functions:
- `create_tenant()` - Inserts tenant with rental fields
- `update_tenant()` - Updates tenant including rental fields
- `get_tenant()` - Retrieves tenant with rental data
- `list_tenants()` - Queries tenants with rental filters

#### Migration Impact:
- **High Impact**: All functions need updates
- **Required Changes**:
  - Remove rental field columns from queries
  - Update table schemas to exclude rental fields
  - Update filter logic to remove rental-based filters

### 2. Unit Database (`db/units.py`)

#### Current Functions:
- `create_unit()` - Inserts unit with rental fields
- `update_unit()` - Updates unit including rental fields
- `get_unit()` - Retrieves unit with rental data
- `list_units()` - Queries units with rental filters

#### Migration Impact:
- **High Impact**: All functions need updates
- **Required Changes**:
  - Remove rental field columns from queries
  - Update table schemas to exclude rental fields
  - Update filter logic to remove rental-based filters

### 3. Lease Database (`db/leases.py`)

#### Current Functions:
- `create_lease()` - Inserts lease record
- `update_lease()` - Updates lease record
- `get_lease()` - Retrieves lease details
- `list_leases()` - Queries leases

#### Migration Impact:
- **Low Impact**: Functions need minor updates
- **Required Changes**:
  - Add new field columns to queries
  - Update table schemas to include new fields
  - Update filter logic to include new fields

## Frontend Component Analysis

### 1. Tenant Management Components

#### Affected Components:
- `TenantForm.tsx` - Tenant creation/editing form
- `TenantCard.tsx` - Tenant display card
- `TenantProfilePage.tsx` - Tenant profile page
- `TenantEditPage.tsx` - Tenant editing page

#### Current Rental Data Usage:
- **Display**: Shows rental information (rent, dates, frequency)
- **Input**: Collects rental information in forms
- **API Calls**: Sends rental data to tenant endpoints

#### Migration Impact:
- **High Impact**: All components need updates
- **Required Changes**:
  - Remove rental fields from forms
  - Update display logic to show lease information
  - Update API calls to use lease endpoints
  - Add lease creation/editing functionality

### 2. Unit Management Components

#### Affected Components:
- `UnitCard.tsx` - Unit display card
- `AddUnitForm.tsx` - Unit creation form
- Property details pages with unit information

#### Current Rental Data Usage:
- **Display**: Shows rental information (rent, deposit, dates)
- **Input**: Collects rental information in forms
- **API Calls**: Sends rental data to unit endpoints

#### Migration Impact:
- **High Impact**: All components need updates
- **Required Changes**:
  - Remove rental fields from forms
  - Update display logic to show lease information
  - Update API calls to use lease endpoints
  - Add lease creation/editing functionality

### 3. Lease Management Components

#### Affected Components:
- `CreateLeaseModal.tsx` - Lease creation modal
- `AssignTenantModal.tsx` - Tenant assignment modal
- `LeaseManagement.tsx` - Lease management interface

#### Current Rental Data Usage:
- **Display**: Shows lease information
- **Input**: Collects lease information
- **API Calls**: Sends lease data to lease endpoints

#### Migration Impact:
- **Medium Impact**: Components need updates
- **Required Changes**:
  - Add rental type selection (rent vs lease)
  - Add rental frequency selection
  - Add maintenance fee and advance amount fields
  - Update validation logic
  - Update API calls to include new fields

### 4. Property Management Components

#### Affected Components:
- `PropertyCard.tsx` - Property display card
- `PropertyDashboard.tsx` - Property dashboard
- Property details pages

#### Current Rental Data Usage:
- **Display**: Shows aggregated rental information
- **API Calls**: Fetches rental data from property endpoints

#### Migration Impact:
- **Medium Impact**: Components need updates
- **Required Changes**:
  - Update rental data aggregation logic
  - Update API calls to use lease-based aggregation
  - Update display logic to show lease information

## API Service Layer Analysis (Frontend)

### 1. Tenant API Service (`tenantService.ts`)

#### Current Functions:
- `getTenants()` - Fetches tenants with rental data
- `createTenant()` - Creates tenant with rental data
- `updateTenant()` - Updates tenant including rental fields
- `getTenant()` - Fetches tenant with rental data

#### Migration Impact:
- **High Impact**: All functions need updates
- **Required Changes**:
  - Remove rental field handling from API calls
  - Update request/response types to exclude rental fields
  - Add lease creation/update logic for rental data

### 2. Unit API Service (`unitService.ts`)

#### Current Functions:
- `getUnits()` - Fetches units with rental data
- `createUnit()` - Creates unit with rental data
- `updateUnit()` - Updates unit including rental fields
- `getUnit()` - Fetches unit with rental data

#### Migration Impact:
- **High Impact**: All functions need updates
- **Required Changes**:
  - Remove rental field handling from API calls
  - Update request/response types to exclude rental fields
  - Add lease creation/update logic for rental data

### 3. Lease API Service (`leaseService.ts`)

#### Current Functions:
- `getLeases()` - Fetches leases
- `createLease()` - Creates lease
- `updateLease()` - Updates lease
- `getLease()` - Fetches lease details

#### Migration Impact:
- **Medium Impact**: Functions need updates
- **Required Changes**:
  - Add new field handling (rental_type, rental_frequency, etc.)
  - Update request/response types to include new fields
  - Update validation logic

## Migration Strategy by Component

### Phase 1: Backend Database Migration
1. **Execute data migration script** (already created)
2. **Update database models** to remove rental fields
3. **Update database queries** to exclude rental fields
4. **Add new fields to leases table**

### Phase 2: Backend API Updates
1. **Update tenant endpoints** to remove rental handling
2. **Update unit endpoints** to remove rental handling
3. **Update lease endpoints** to include new fields
4. **Update property endpoints** to use lease aggregation

### Phase 3: Frontend Component Updates
1. **Update tenant components** to remove rental fields
2. **Update unit components** to remove rental fields
3. **Update lease components** to include new fields
4. **Update property components** to use lease data

### Phase 4: API Service Updates
1. **Update tenant API service** to remove rental handling
2. **Update unit API service** to remove rental handling
3. **Update lease API service** to include new fields
4. **Update property API service** to use lease aggregation

## Risk Mitigation

### 1. Breaking Changes
- **Risk**: Frontend components may break if rental data is removed
- **Mitigation**: Implement feature flags and gradual rollout
- **Strategy**: Deploy backend changes first, then frontend updates

### 2. Data Loss
- **Risk**: Rental data could be lost during migration
- **Mitigation**: Comprehensive backup strategy and rollback procedures
- **Strategy**: Test migration in staging environment first

### 3. Performance Impact
- **Risk**: Database queries may become slower with joins
- **Mitigation**: Optimize queries and add proper indexing
- **Strategy**: Monitor performance during migration

### 4. User Experience
- **Risk**: Users may lose access to rental information
- **Mitigation**: Ensure all rental data is accessible through lease interface
- **Strategy**: Provide clear migration path and user guidance

## Testing Strategy

### 1. Unit Testing
- **Backend**: Test all updated functions with new data structure
- **Frontend**: Test all updated components with new API responses
- **Database**: Test all updated queries and migrations

### 2. Integration Testing
- **API Testing**: Test all endpoints with new request/response formats
- **Component Testing**: Test all components with new data flow
- **Database Testing**: Test all migrations and rollback procedures

### 3. End-to-End Testing
- **User Flows**: Test complete user journeys with new data structure
- **Data Integrity**: Verify no data loss during migration
- **Performance**: Test application performance with new queries

## Conclusion

The database consolidation project will have a significant impact on the entire application stack. However, with proper planning and execution, the migration can be completed successfully while maintaining data integrity and user experience. The key is to follow a phased approach with comprehensive testing at each stage. 