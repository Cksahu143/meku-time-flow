-- Fix shared_timetables INSERT policy (currently allows anyone to insert)
DROP POLICY IF EXISTS "System can insert shared timetables" ON public.shared_timetables;

-- Users can only insert shared_timetables for themselves when they have an accepted invitation
CREATE POLICY "Users can insert shared timetables for accepted invitations"
  ON public.shared_timetables
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.timetable_invitations
      WHERE timetable_invitations.timetable_id = shared_timetables.timetable_id
        AND timetable_invitations.to_email = auth.email()
        AND timetable_invitations.status = 'accepted'
    )
  );

-- Also allow timetable owners to share their own timetables
CREATE POLICY "Timetable owners can share their timetables"
  ON public.shared_timetables
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timetables
      WHERE timetables.id = shared_timetables.timetable_id
        AND timetables.user_id = auth.uid()
    )
    AND auth.uid() = shared_by_user_id
  );

-- Update profiles SELECT policy to properly handle email visibility
-- First drop the existing policies that may conflict
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a unified SELECT policy that respects email_visible
-- Note: The profiles_secure view handles email masking, but base table access should still be controlled
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles"
  ON public.profiles
  FOR SELECT
  USING (is_public = true);