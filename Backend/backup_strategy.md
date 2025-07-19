# Backup Strategy - Database Consolidation Project

## Executive Summary

This document outlines the comprehensive backup strategy for the database consolidation project to ensure data safety and provide rollback capabilities during the migration process.

## Pre-Migration Backup Strategy

### 1. Full Database Backup

#### Automated Backup
```bash
# Create full database backup before migration
pg_dump -h db.oniudnupeazkagtbsxtt.supabase.co \
        -U postgres \
        -d postgres \
        -F c \
        -f backup_pre_migration_$(date +%Y%m%d_%H%M%S).dump
```

#### Manual Backup via Supabase Dashboard
1. **Access Supabase Dashboard**
   - Navigate to project: `sb1-itkdi9fs`
   - Go to Database → Backups
   - Create manual backup with timestamp

#### Backup Verification
```sql
-- Verify backup integrity
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;
```

### 2. Rental Data Export

#### Export Rental Data from All Tables
```sql
-- Export tenants rental data
COPY (
    SELECT 
        id,
        rent,
        rental_start_date,
        rental_end_date,
        rental_type,
        rental_frequency,
        maintenance_fee,
        created_at,
        updated_at
    FROM tenants 
    WHERE rent IS NOT NULL 
       OR rental_start_date IS NOT NULL 
       OR rental_end_date IS NOT NULL 
       OR rental_type IS NOT NULL 
       OR rental_frequency IS NOT NULL 
       OR maintenance_fee IS NOT NULL
) TO '/tmp/backup_tenants_rental_data.csv' WITH CSV HEADER;

-- Export units rental data
COPY (
    SELECT 
        id,
        property_id,
        rent,
        deposit,
        start_date,
        end_date,
        rent_frequency,
        created_at,
        updated_at
    FROM units 
    WHERE rent IS NOT NULL 
       OR deposit IS NOT NULL 
       OR start_date IS NOT NULL 
       OR end_date IS NOT NULL 
       OR rent_frequency IS NOT NULL
) TO '/tmp/backup_units_rental_data.csv' WITH CSV HEADER;

-- Export property_tenants rental data
COPY (
    SELECT 
        id,
        property_id,
        tenant_id,
        unit_id,
        rent_amount,
        deposit_amount,
        start_date,
        end_date,
        created_at,
        updated_at
    FROM property_tenants 
    WHERE rent_amount IS NOT NULL 
       OR deposit_amount IS NOT NULL 
       OR start_date IS NOT NULL 
       OR end_date IS NOT NULL
) TO '/tmp/backup_property_tenants_rental_data.csv' WITH CSV HEADER;

-- Export current leases data
COPY (
    SELECT 
        id,
        property_id,
        unit_id,
        tenant_id,
        start_date,
        end_date,
        rent_amount,
        deposit_amount,
        status,
        created_at,
        updated_at
    FROM leases
) TO '/tmp/backup_current_leases_data.csv' WITH CSV HEADER;
```

### 3. Application State Backup

#### Database Schema Backup
```sql
-- Export current schema
pg_dump -h db.oniudnupeazkagtbsxtt.supabase.co \
        -U postgres \
        -d postgres \
        --schema-only \
        -f backup_schema_$(date +%Y%m%d_%H%M%S).sql
```

#### Configuration Backup
```bash
# Backup environment configurations
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
cp Backend/app/config/*.py Backend/config_backup/
```

## During Migration Backup Strategy

### 1. Transaction-Level Backups

#### Create Backup Tables
```sql
-- Create backup tables for each migration step
CREATE TABLE IF NOT EXISTS backup_tenants_rental_data AS
SELECT * FROM tenants 
WHERE rent IS NOT NULL 
   OR rental_start_date IS NOT NULL 
   OR rental_end_date IS NOT NULL 
   OR rental_type IS NOT NULL 
   OR rental_frequency IS NOT NULL 
   OR maintenance_fee IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_units_rental_data AS
SELECT * FROM units 
WHERE rent IS NOT NULL 
   OR deposit IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL 
   OR rent_frequency IS NOT NULL;

CREATE TABLE IF NOT EXISTS backup_property_tenants_rental_data AS
SELECT * FROM property_tenants 
WHERE rent_amount IS NOT NULL 
   OR deposit_amount IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL;
```

#### Incremental Backups
```sql
-- Create incremental backup after each major step
CREATE TABLE IF NOT EXISTS backup_step1_completed AS
SELECT NOW() as completed_at, 'Step 1: Backup tables created' as step_description;

CREATE TABLE IF NOT EXISTS backup_step2_completed AS
SELECT NOW() as completed_at, 'Step 2: New fields added to leases table' as step_description;

CREATE TABLE IF NOT EXISTS backup_step3_completed AS
SELECT NOW() as completed_at, 'Step 3: Orphaned data migrated' as step_description;
```

### 2. Validation Checkpoints

#### Data Integrity Checks
```sql
-- Checkpoint 1: Verify backup tables created
SELECT 
    'backup_tenants_rental_data' as table_name,
    COUNT(*) as record_count
FROM backup_tenants_rental_data
UNION ALL
SELECT 
    'backup_units_rental_data' as table_name,
    COUNT(*) as record_count
FROM backup_units_rental_data
UNION ALL
SELECT 
    'backup_property_tenants_rental_data' as table_name,
    COUNT(*) as record_count
FROM backup_property_tenants_rental_data;

-- Checkpoint 2: Verify new fields added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'leases' 
  AND column_name IN ('rental_type', 'rental_frequency', 'maintenance_fee', 'advance_amount');

-- Checkpoint 3: Verify data migration
SELECT 
    'tenants_with_rental_data' as check_type,
    COUNT(*) as count
FROM tenants 
WHERE rent IS NOT NULL 
   OR rental_start_date IS NOT NULL 
   OR rental_end_date IS NOT NULL 
   OR rental_type IS NOT NULL 
   OR rental_frequency IS NOT NULL 
   OR maintenance_fee IS NOT NULL
UNION ALL
SELECT 
    'units_with_rental_data' as check_type,
    COUNT(*) as count
FROM units 
WHERE rent IS NOT NULL 
   OR deposit IS NOT NULL 
   OR start_date IS NOT NULL 
   OR end_date IS NOT NULL 
   OR rent_frequency IS NOT NULL
UNION ALL
SELECT 
    'leases_created' as check_type,
    COUNT(*) as count
FROM leases;
```

## Rollback Strategy

### 1. Immediate Rollback (Within Transaction)

#### Rollback Script
```sql
-- ROLLBACK SCRIPT - Execute if migration fails within transaction
BEGIN;

-- Restore rental data to tenants table
UPDATE tenants t
SET 
    rent = l.rent_amount,
    rental_start_date = l.start_date,
    rental_end_date = l.end_date,
    rental_type = l.rental_type,
    rental_frequency = l.rental_frequency,
    maintenance_fee = l.maintenance_fee,
    updated_at = NOW()
FROM leases l
WHERE t.id = l.tenant_id
  AND l.created_at >= (SELECT MAX(created_at) FROM backup_tenants_rental_data);

-- Restore rental data to units table
UPDATE units u
SET 
    rent = l.rent_amount,
    deposit = l.deposit_amount,
    start_date = l.start_date,
    end_date = l.end_date,
    rent_frequency = l.rental_frequency,
    updated_at = NOW()
FROM leases l
WHERE u.id = l.unit_id
  AND l.created_at >= (SELECT MAX(created_at) FROM backup_units_rental_data);

-- Delete newly created leases
DELETE FROM leases 
WHERE created_at >= (SELECT MAX(created_at) FROM backup_tenants_rental_data);

-- Drop backup tables
DROP TABLE IF EXISTS backup_tenants_rental_data;
DROP TABLE IF EXISTS backup_units_rental_data;
DROP TABLE IF EXISTS backup_property_tenants_rental_data;

COMMIT;
```

### 2. Full Database Restore

#### Restore from Backup
```bash
# Restore full database from backup
pg_restore -h db.oniudnupeazkagtbsxtt.supabase.co \
           -U postgres \
           -d postgres \
           --clean \
           --if-exists \
           backup_pre_migration_20250115_120000.dump
```

#### Restore from CSV Exports
```sql
-- Restore tenants rental data
COPY tenants (id, rent, rental_start_date, rental_end_date, rental_type, rental_frequency, maintenance_fee, created_at, updated_at)
FROM '/tmp/backup_tenants_rental_data.csv' WITH CSV HEADER;

-- Restore units rental data
COPY units (id, property_id, rent, deposit, start_date, end_date, rent_frequency, created_at, updated_at)
FROM '/tmp/backup_units_rental_data.csv' WITH CSV HEADER;

-- Restore property_tenants rental data
COPY property_tenants (id, property_id, tenant_id, unit_id, rent_amount, deposit_amount, start_date, end_date, created_at, updated_at)
FROM '/tmp/backup_property_tenants_rental_data.csv' WITH CSV HEADER;
```

## Post-Migration Backup Strategy

### 1. Validation Backups

#### Data Integrity Verification
```sql
-- Verify no data loss
SELECT 
    'tenants_original' as table_name,
    COUNT(*) as original_count
FROM backup_tenants_rental_data
UNION ALL
SELECT 
    'tenants_current' as table_name,
    COUNT(*) as current_count
FROM tenants 
WHERE rent IS NOT NULL 
   OR rental_start_date IS NOT NULL 
   OR rental_end_date IS NOT NULL 
   OR rental_type IS NOT NULL 
   OR rental_frequency IS NOT NULL 
   OR maintenance_fee IS NOT NULL
UNION ALL
SELECT 
    'leases_final' as table_name,
    COUNT(*) as final_count
FROM leases;
```

#### Application Functionality Verification
```sql
-- Verify all relationships are intact
SELECT 
    'tenant_lease_relationships' as check_type,
    COUNT(*) as count
FROM tenants t
JOIN leases l ON t.id = l.tenant_id
UNION ALL
SELECT 
    'unit_lease_relationships' as check_type,
    COUNT(*) as count
FROM units u
JOIN leases l ON u.id = l.unit_id
UNION ALL
SELECT 
    'property_lease_relationships' as check_type,
    COUNT(*) as count
FROM properties p
JOIN leases l ON p.id = l.property_id;
```

### 2. Performance Monitoring

#### Query Performance Checks
```sql
-- Monitor query performance after migration
EXPLAIN ANALYZE
SELECT 
    p.property_name,
    COUNT(l.id) as lease_count,
    SUM(l.rent_amount) as total_rent
FROM properties p
LEFT JOIN leases l ON p.id = l.property_id
GROUP BY p.id, p.property_name;

-- Monitor index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Backup Storage Strategy

### 1. Local Storage
```bash
# Create backup directory structure
mkdir -p backups/$(date +%Y%m%d)
mkdir -p backups/$(date +%Y%m%d)/database
mkdir -p backups/$(date +%Y%m%d)/csv_exports
mkdir -p backups/$(date +%Y%m%d)/configs

# Move backup files to organized structure
mv backup_pre_migration_*.dump backups/$(date +%Y%m%d)/database/
mv backup_*_rental_data.csv backups/$(date +%Y%m%d)/csv_exports/
mv .env.backup.* backups/$(date +%Y%m%d)/configs/
```

### 2. Cloud Storage
```bash
# Upload backups to cloud storage (AWS S3 example)
aws s3 cp backups/$(date +%Y%m%d) s3://propo-backups/migration/$(date +%Y%m%d) --recursive

# Upload to Supabase Storage
supabase storage upload backups/$(date +%Y%m%d) migration-backups/$(date +%Y%m%d)
```

### 3. Backup Retention Policy
```bash
# Keep backups for 30 days
find backups/ -type d -mtime +30 -exec rm -rf {} \;

# Keep cloud backups for 90 days
aws s3 ls s3://propo-backups/migration/ | awk '{print $2}' | while read folder; do
    folder_date=$(echo $folder | sed 's/\///')
    days_old=$(( ( $(date +%s) - $(date -d $folder_date +%s) ) / 86400 ))
    if [ $days_old -gt 90 ]; then
        aws s3 rm s3://propo-backups/migration/$folder --recursive
    fi
done
```

## Monitoring and Alerting

### 1. Backup Monitoring
```sql
-- Create monitoring table
CREATE TABLE IF NOT EXISTS backup_monitoring (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    backup_path TEXT NOT NULL,
    backup_size BIGINT,
    backup_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Monitor backup completion
SELECT 
    backup_type,
    COUNT(*) as total_backups,
    COUNT(CASE WHEN backup_status = 'completed' THEN 1 END) as completed_backups,
    COUNT(CASE WHEN backup_status = 'failed' THEN 1 END) as failed_backups
FROM backup_monitoring
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY backup_type;
```

### 2. Alerting Setup
```bash
# Create alert script
cat > backup_alert.sh << 'EOF'
#!/bin/bash

# Check backup status and send alerts
BACKUP_STATUS=$(psql -h db.oniudnupeazkagtbsxtt.supabase.co -U postgres -d postgres -t -c "
SELECT COUNT(*) FROM backup_monitoring 
WHERE backup_status = 'failed' 
  AND created_at >= NOW() - INTERVAL '1 hour'
")

if [ $BACKUP_STATUS -gt 0 ]; then
    echo "ALERT: $BACKUP_STATUS backup(s) failed in the last hour" | mail -s "Backup Alert" admin@propo.com
fi
EOF

chmod +x backup_alert.sh

# Add to crontab for hourly monitoring
echo "0 * * * * /path/to/backup_alert.sh" | crontab -
```

## Testing the Backup Strategy

### 1. Backup Testing
```bash
# Test backup restoration in staging environment
pg_restore -h staging-db.supabase.co \
           -U postgres \
           -d postgres \
           --clean \
           --if-exists \
           backup_pre_migration_20250115_120000.dump

# Verify data integrity in staging
psql -h staging-db.supabase.co -U postgres -d postgres -f verify_backup.sql
```

### 2. Rollback Testing
```bash
# Test rollback procedures in staging
psql -h staging-db.supabase.co -U postgres -d postgres -f rollback_test.sql

# Verify rollback success
psql -h staging-db.supabase.co -U postgres -d postgres -f verify_rollback.sql
```

## Conclusion

This comprehensive backup strategy ensures data safety throughout the database consolidation project. The multi-layered approach provides multiple recovery options and minimizes the risk of data loss during migration. Regular testing and monitoring of the backup procedures will ensure they remain effective and reliable. 