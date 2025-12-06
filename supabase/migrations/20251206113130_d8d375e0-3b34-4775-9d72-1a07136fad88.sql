-- Fix 1: Restrict notifications INSERT policy to prevent spam/abuse
-- Only allow inserts where the authenticated user is the actor
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

CREATE POLICY "Users can insert notifications with valid actor"
  ON notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    (metadata->>'actor_id')::uuid = auth.uid()
  );

-- Fix 2: Create a secure view for profiles that respects email_visible
-- This view conditionally exposes email based on the email_visible setting
CREATE OR REPLACE VIEW public.profiles_secure AS
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