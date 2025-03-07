/*
  # Add rental details to tenants

  1. Changes
    - Add rental_type column to tenants table (lease/rent)
    - Add rental details columns:
      - rental_frequency (monthly/quarterly/half-yearly/yearly)
      - rental_amount
      - advance_amount
      - rental_start_date
      - rental_end_date
      - lease_amount
      - lease_start_date
      - lease_end_date

  2. Security
    - Maintain existing RLS policies
*/

-- Add rental details columns to tenants table
ALTER TABLE tenants
ADD COLUMN rental_type TEXT CHECK (rental_type IN ('lease', 'rent')),
ADD COLUMN rental_frequency TEXT CHECK (rental_frequency IN ('monthly', 'quarterly', 'half-yearly', 'yearly')),
ADD COLUMN rental_amount DECIMAL(10,2),
ADD COLUMN advance_amount DECIMAL(10,2),
ADD COLUMN rental_start_date DATE,
ADD COLUMN rental_end_date DATE,
ADD COLUMN lease_amount DECIMAL(10,2),
ADD COLUMN lease_start_date DATE,
ADD COLUMN lease_end_date DATE;