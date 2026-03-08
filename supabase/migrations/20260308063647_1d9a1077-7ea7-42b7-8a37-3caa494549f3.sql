
-- Make chat-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';

-- Make resources bucket private
UPDATE storage.buckets SET public = false WHERE id = 'resources';

-- Drop the anon SELECT policy on resources storage
DROP POLICY IF EXISTS "Anyone can view public resource files" ON storage.objects;

-- Add authenticated SELECT policy for resources (owner-scoped)
CREATE POLICY "Authenticated users can view own resource files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add authenticated SELECT policy for chat-files (authenticated users only)
CREATE POLICY "Authenticated users can view chat files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-files');
