-- Add voice message and edit/delete support to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS voice_url TEXT,
ADD COLUMN IF NOT EXISTS voice_duration INTEGER,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for voice messages bucket
CREATE POLICY "Users can view voice messages in their groups"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-messages' AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.group_members gm ON gm.group_id = m.group_id
    WHERE m.voice_url = storage.objects.name
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own voice messages"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-messages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);