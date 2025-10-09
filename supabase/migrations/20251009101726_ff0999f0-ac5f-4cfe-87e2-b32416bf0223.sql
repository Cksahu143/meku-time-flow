-- Update existing profiles table to add new columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Update email to match auth email for existing profiles
UPDATE public.profiles 
SET email = (SELECT email FROM auth.users WHERE auth.users.id = profiles.id)
WHERE email IS NULL;

-- Make email not null after populating
ALTER TABLE public.profiles 
ALTER COLUMN email SET NOT NULL;

-- Add unique constraint on email
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Update RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (is_public = true OR auth.uid() = id);

-- Create timetables table to store user timetables
CREATE TABLE public.timetables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Timetable',
  periods JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme_colors JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- Users can view their own timetables
CREATE POLICY "Users can view their own timetables"
ON public.timetables
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own timetables
CREATE POLICY "Users can create their own timetables"
ON public.timetables
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own timetables
CREATE POLICY "Users can update their own timetables"
ON public.timetables
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own timetables
CREATE POLICY "Users can delete their own timetables"
ON public.timetables
FOR DELETE
USING (auth.uid() = user_id);

-- Create timetable_invitations table
CREATE TABLE public.timetable_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_email TEXT NOT NULL,
  timetable_id UUID NOT NULL REFERENCES public.timetables(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timetable_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations sent to them or by them
CREATE POLICY "Users can view their invitations"
ON public.timetable_invitations
FOR SELECT
USING (
  auth.uid() = from_user_id OR 
  auth.email() = to_email
);

-- Users can create invitations for their own timetables
CREATE POLICY "Users can create invitations"
ON public.timetable_invitations
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Users can update invitations sent to them
CREATE POLICY "Users can update their invitations"
ON public.timetable_invitations
FOR UPDATE
USING (auth.email() = to_email);

-- Create shared_timetables table for accepted shares
CREATE TABLE public.shared_timetables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timetable_id UUID NOT NULL REFERENCES public.timetables(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, timetable_id)
);

-- Enable RLS
ALTER TABLE public.shared_timetables ENABLE ROW LEVEL SECURITY;

-- Users can view their shared timetables
CREATE POLICY "Users can view their shared timetables"
ON public.shared_timetables
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete shared timetables they received
CREATE POLICY "Users can delete their shared timetables"
ON public.shared_timetables
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert shared timetables
CREATE POLICY "System can insert shared timetables"
ON public.shared_timetables
FOR INSERT
WITH CHECK (true);

-- Allow users to view timetables shared with them
CREATE POLICY "Users can view shared timetables"
ON public.timetables
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_timetables
    WHERE shared_timetables.timetable_id = timetables.id
    AND shared_timetables.user_id = auth.uid()
  )
);

-- Create triggers for automatic timestamp updates on new tables
CREATE TRIGGER update_timetables_updated_at
BEFORE UPDATE ON public.timetables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.timetable_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();