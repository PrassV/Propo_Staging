/*
  # Fix User Profiles RLS Policies

  1. Changes
    - Drop existing RLS policies for user_profiles
    - Create new policies that properly handle all operations
    - Add policy for initial profile creation
    - Add policy for profile updates

  2. Security
    - Maintains row-level security
    - Ensures users can only access their own profiles
    - Allows initial profile creation during signup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new policies
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Update user_profiles table constraints
ALTER TABLE user_profiles
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN address_line1 DROP NOT NULL,
ALTER COLUMN city DROP NOT NULL,
ALTER COLUMN state DROP NOT NULL,
ALTER COLUMN pincode DROP NOT NULL,
ALTER COLUMN id_type DROP NOT NULL;