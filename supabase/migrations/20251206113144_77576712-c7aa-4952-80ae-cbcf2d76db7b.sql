-- Fix the SECURITY DEFINER view warning by using SECURITY INVOKER instead
-- Drop and recreate the view with SECURITY INVOKER (the default, but explicit is better)
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  display_name,
  avatar_url,
  bio,
  profile_header_url,
  is_public,
  last_seen,
  created_at,
  updated_at,
  theme,
  CASE 
    WHEN id = auth.uid() THEN email  -- Owner always sees their own email
    WHEN email_visible = true THEN email  -- Others see email only if visible
    ELSE NULL 
  END as email,
  CASE 
    WHEN id = auth.uid() THEN email_visible  -- Owner sees their setting
    ELSE NULL 
  END as email_visible
FROM profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.profiles_secure TO anon;