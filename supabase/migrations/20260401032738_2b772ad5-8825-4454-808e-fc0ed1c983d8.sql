
-- 1. Fix announcements: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view announcements for their school" ON public.announcements;
CREATE POLICY "Authenticated users can view announcements for their school"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING ((school_id = current_user_school_id()) OR (school_id IS NULL));

-- 2. Fix current_user_school_id() to be deterministic
CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND school_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- 3. Add voice messages DM storage policy
CREATE POLICY "Users can view DM voice messages"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice-messages' AND
    EXISTS (
      SELECT 1
      FROM direct_messages dm
      JOIN conversations c ON c.id = dm.conversation_id
      WHERE dm.voice_url LIKE '%' || objects.name || '%'
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
