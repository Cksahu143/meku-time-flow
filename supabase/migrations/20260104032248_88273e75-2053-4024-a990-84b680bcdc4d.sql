-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Group members can view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Group members can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat files" ON storage.objects;

-- Policy for viewing chat files:
-- 1. Group files: path is {group_id}/{user_id}/{filename} - check group membership
-- 2. Direct message files: path is {user_id}-{timestamp}.{ext} - check conversation membership or ownership
CREATE POLICY "Users can view chat files they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-files' AND
  (
    -- Group chat files: check group membership via path structure {group_id}/...
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
    )
    OR
    -- Direct message files: user owns the file (filename starts with their user_id)
    name LIKE auth.uid()::text || '-%'
    OR
    -- Direct message files: user is in the conversation that has this file
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.conversations c ON c.id = dm.conversation_id
      WHERE dm.file_url LIKE '%' || objects.name || '%'
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
);

-- Policy for uploading chat files:
-- 1. Group files: must be group member and upload to their own folder
-- 2. Direct message files: upload with their user_id prefix
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' AND
  (
    -- Group chat files: must be group member and use correct user folder
    (
      EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
      )
      AND auth.uid()::text = (storage.foldername(name))[2]
    )
    OR
    -- Direct message files: must start with own user_id
    name LIKE auth.uid()::text || '-%'
  )
);

-- Policy for deleting chat files: users can only delete their own files
CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-files' AND
  (
    -- Group chat files: user owns the file (their user_id in path)
    auth.uid()::text = (storage.foldername(name))[2]
    OR
    -- Direct message files: filename starts with user_id
    name LIKE auth.uid()::text || '-%'
  )
);