-- Add email_visible column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_visible boolean DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.profiles.email_visible IS 'Whether the user email is visible to others';