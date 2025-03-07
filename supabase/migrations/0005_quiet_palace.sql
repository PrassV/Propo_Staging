/*
  # Fix User Profiles Policies

  1. Changes
    - Add INSERT policy for user_profiles table
    - Update existing policies to allow full management of own profile
    - Ensure authenticated users can create and update their profiles

  2. Security
    - Maintain RLS protection
    - Allow users to manage only their own profiles
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
END $$;

-- Create comprehensive policies for user_profiles
CREATE POLICY "Users can manage own profile"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create policy specifically for INSERT
CREATE POLICY "Users can create their profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);