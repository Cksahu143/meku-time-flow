-- Create table to store SSO tokens (for single-use verification)
CREATE TABLE public.sso_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edas_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'student',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sso_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow server-side access (edge functions with service role)
-- No direct client access for security
CREATE POLICY "No direct access to sso_tokens" 
ON public.sso_tokens 
FOR ALL 
USING (false);

-- Create index for faster token lookup
CREATE INDEX idx_sso_tokens_hash ON public.sso_tokens(token_hash);
CREATE INDEX idx_sso_tokens_expires ON public.sso_tokens(expires_at);

-- Clean up expired tokens automatically (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sso_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.sso_tokens 
  WHERE expires_at < now() OR used_at IS NOT NULL;
END;
$$;