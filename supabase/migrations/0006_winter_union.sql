/*
  # Fix User Signup Process

  1. Changes
    - Update handle_new_user trigger function to use upsert instead of insert
    - This prevents duplicate key violations while still ensuring each user has a profile

  2. Security
    - Maintains existing security model
    - Ensures data integrity during user creation
*/

-- Update the handle_new_user function to use upsert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;