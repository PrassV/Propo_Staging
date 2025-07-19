# Data Inventory Analysis - Phase 1

## Executive Summary

This document provides a comprehensive analysis of the current rental data distribution across the database tables, identifying data inconsistencies, orphaned records, and migration requirements for the database consolidation project.

## Current Data Distribution

### 1. Tenants Table Analysis
- **Total Records**: 9
- **Records with Rent**: 3 (33.3%)
- **Records with Start Date**: 4 (44.4%)
- **Records with End Date**: 4 (44.4%)
- **Records with Rental Type**: 1 (11.1%)
- **Records with Frequency**: 7 (77.8%)
- **Records with Maintenance Fee**: 0 (0%)

### 2. Units Table Analysis
- **Total Records**: 13
- **Records with Rent**: 6 (46.2%)
- **Records with Deposit**: 9 (69.2%)
- **Records with Start Date**: 5 (38.5%)
- **Records with End Date**: 5 (38.5%)
- **Records with Frequency**: 2 (15.4%)

### 3. Property_Tenants Table Analysis
- **Total Records**: 1
- **Records with Rent Amount**: 1 (100%)
- **Records with Deposit Amount**: 0 (0%)
- **Records with Start Date**: 1 (100%)
- **Records with End Date**: 1 (100%)

### 4. Leases Table Analysis
- **Total Records**: 9
- **Records with Rent Amount**: 9 (100%)
- **Records with Deposit Amount**: 9 (100%)
- **Records with Start Date**: 9 (100%)
- **Records with End Date**: 9 (100%)

## Data Inconsistencies Identified

### 1. Orphaned Rental Data in Tenants Table
- **1 tenant** has rental data (start_date, end_date, rental_type, rental_frequency) but no corresponding lease record
- **Tenant ID**: 742de726-62fc-460e-8bbf-de839718d2e5
- **Name**: Harini
- **Issue**: Rental data exists in tenants table but no lease record exists

### 2. Orphaned Rental Data in Units Table
- **2 units** have rental data but no corresponding lease records:
  - **Unit 8**: Has deposit amount (₹120,000) but no lease
  - **Unit B1**: Has rent (₹23,525,342) and deposit (₹234,323) but no lease

## Migration Impact Analysis

### Data to be Migrated from Tenants Table
- **Rental fields to migrate**:
  - `rent` → `leases.rent_amount`
  - `rental_start_date` → `leases.start_date`
  - `rental_end_date` → `leases.end_date`
  - `rental_type` → `leases.rental_type` (new field needed)
  - `rental_frequency` → `leases.rental_frequency` (new field needed)
  - `maintenance_fee` → `leases.maintenance_fee` (new field needed)

### Data to be Migrated from Units Table
- **Rental fields to migrate**:
  - `rent` → `leases.rent_amount`
  - `deposit` → `leases.deposit_amount`
  - `start_date` → `leases.start_date`
  - `end_date` → `leases.end_date`
  - `rent_frequency` → `leases.rental_frequency` (new field needed)

### Data to be Migrated from Property_Tenants Table
- **Rental fields to migrate**:
  - `rent_amount` → `leases.rent_amount`
  - `deposit_amount` → `leases.deposit_amount`
  - `start_date` → `leases.start_date`
  - `end_date` → `leases.end_date`

## Risk Assessment

### High Risk Items
1. **Data Loss Risk**: 1 tenant and 2 units have rental data that could be lost if not properly migrated
2. **Data Integrity Risk**: Multiple tables contain rental data for the same relationships
3. **Application Breaking Risk**: Frontend components may break if rental data is removed without proper migration

### Medium Risk Items
1. **Performance Impact**: Migration process may temporarily affect application performance
2. **Rollback Complexity**: Reverting changes requires careful planning

### Low Risk Items
1. **Data Volume**: Relatively small dataset (9 tenants, 13 units, 9 leases)
2. **Testing Environment**: Can be tested in staging before production

## Migration Strategy Recommendations

### Phase 1: Preparation (Current)
- ✅ Data inventory completed
- ✅ Risk assessment completed
- 🔄 Create backup strategy
- 🔄 Design migration scripts

### Phase 2: Migration
1. **Add missing fields to leases table**:
   - `rental_type` (rent/lease)
   - `rental_frequency` (monthly/quarterly/yearly)
   - `maintenance_fee`
   - `advance_amount`

2. **Migrate orphaned data**:
   - Create lease records for tenant 742de726-62fc-460e-8bbf-de839718d2e5
   - Create lease records for units 7b1ebf3e-17ba-494e-9a5e-af6b27e2a8a4 and 03262432-4b3f-414b-93f2-8807469843f2

3. **Consolidate duplicate data**:
   - Merge rental data from tenants, units, and property_tenants into leases table

### Phase 3: Cleanup
1. **Remove rental fields from tenants table**
2. **Remove rental fields from units table**
3. **Drop property_tenants table** (if no other data exists)

## Backup Strategy

### Pre-Migration Backups
1. **Full database backup** before any changes
2. **Export rental data** from all affected tables
3. **Create rollback scripts** for each migration step

### Post-Migration Validation
1. **Data integrity checks** to ensure no data loss
2. **Application functionality tests** to ensure no breaking changes
3. **Performance monitoring** to ensure no degradation

## Next Steps

1. **Create detailed migration scripts** with rollback procedures
2. **Set up staging environment** for testing
3. **Schedule maintenance window** for production migration
4. **Prepare communication plan** for stakeholders
5. **Create monitoring dashboard** for migration progress

## Conclusion

The data inventory reveals significant data duplication across multiple tables, with rental information stored in tenants, units, property_tenants, and leases tables. The consolidation to a single leases table will improve data integrity and reduce complexity. The migration is feasible with proper planning and testing, though care must be taken to preserve orphaned rental data during the process. 