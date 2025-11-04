-- Add file attachment columns to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-files bucket
CREATE POLICY "Group members can view chat files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Group members can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-files' AND
  auth.uid() IS NOT NULL
);

-- Add RLS policy to allow message updates for file attachments
CREATE POLICY "Group members can update messages"
ON public.messages FOR UPDATE
USING (
  is_group_member(auth.uid(), group_id) AND
  user_id = auth.uid()
);