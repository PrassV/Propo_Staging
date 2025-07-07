# Unit Table Migration Plan

## Overview
Remove deprecated `rent` and `deposit` columns from the `units` table to align with the lease-centric architecture.

## Root Cause Analysis
- **Frontend**: ✅ Correctly excludes rent/deposit fields from unit creation form
- **Backend Models**: ✅ Correctly excludes rent/deposit from UnitCreate model  
- **Backend Services**: ✅ Correctly handles unit creation without financial fields
- **Database Schema**: ❌ Still contains deprecated `rent` and `deposit` columns

## Impact Assessment
- **Data Loss Risk**: LOW - These fields are not currently being used by the application
- **Breaking Changes**: NONE - Application code already handles units without these fields
- **Schema Consistency**: HIGH IMPROVEMENT - Aligns database with application architecture

## Migration Steps

### 1. Pre-Migration Verification
Run the verification script to check for any existing data:
```sql
-- Check for existing data in deprecated columns
SELECT 
    COUNT(*) as total_units,
    COUNT(CASE WHEN rent IS NOT NULL THEN 1 END) as units_with_rent,
    COUNT(CASE WHEN deposit IS NOT NULL THEN 1 END) as units_with_deposit
FROM units;
```

### 2. Apply Migration
```bash
# Push the migration to Supabase
npx supabase db push
```

### 3. Post-Migration Updates

#### Update Supabase Types
After migration, regenerate types:
```bash
npx supabase gen types typescript --local > src/api/supabase-types.ts
```

#### Verify Application Functionality
- Test unit creation flow
- Verify lease creation flow  
- Check unit listing and details

## Files Changed
- `supabase/migrations/20250115000001_remove_deprecated_unit_columns.sql` - Migration script
- `src/api/supabase-types.ts` - Will be updated after migration
- `verify_unit_migration.sql` - Pre-migration verification script

## Expected Schema After Migration
```typescript
units: {
  Row: {
    area_sqft: number | null
    bathrooms: number | null  
    bedrooms: number | null
    created_at: string | null
    id: string
    property_id: string
    status: string | null
    unit_number: string
    updated_at: string | null
    // rent and deposit columns removed
  }
}
```

## Rollback Plan
If needed, the columns can be restored with:
```sql
ALTER TABLE public.units 
ADD COLUMN rent DECIMAL(10,2),
ADD COLUMN deposit DECIMAL(10,2);
```

## Validation Checklist
- [ ] Verify no data exists in rent/deposit columns
- [ ] Apply migration successfully
- [ ] Regenerate Supabase types
- [ ] Test unit creation functionality  
- [ ] Test lease creation functionality
- [ ] Verify no application errors 