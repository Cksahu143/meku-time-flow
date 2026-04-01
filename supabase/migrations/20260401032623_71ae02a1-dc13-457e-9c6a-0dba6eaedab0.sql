
-- 1. Fix: profiles_secure view - enable RLS and add policies
ALTER VIEW public.profiles_secure SET (security_invoker = true);

-- 2. Fix: Remove overly broad chat-files storage policy
DROP POLICY IF EXISTS "Authenticated users can view chat files" ON storage.objects;

-- 3. Fix: user_activities - restrict to authenticated users viewing own data
DROP POLICY IF EXISTS "Anyone can view activities" ON public.user_activities;
CREATE POLICY "Users can view own activities"
  ON public.user_activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Fix: Update profiles SELECT policy to only expose safe columns via the secure view
-- We can't restrict columns in RLS, so we'll make the public profiles policy require authentication
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view public profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (is_public = true);
