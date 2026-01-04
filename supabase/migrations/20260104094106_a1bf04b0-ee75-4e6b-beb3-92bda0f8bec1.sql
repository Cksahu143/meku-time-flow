-- Fix email exposure: Update RLS policy to work with profiles_secure view
-- The profiles_secure VIEW already exists and properly filters emails based on email_visible flag
-- We need to update the application to use profiles_secure for public profile queries

-- Create a helper function to get filtered email based on visibility settings
CREATE OR REPLACE FUNCTION public.get_filtered_email(profile_id uuid, profile_email text, profile_email_visible boolean)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN profile_id = auth.uid() THEN profile_email
    WHEN profile_email_visible = true THEN profile_email
    ELSE NULL
  END;
$$;