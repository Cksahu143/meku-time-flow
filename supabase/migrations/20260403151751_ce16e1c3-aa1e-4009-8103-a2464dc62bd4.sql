
-- Fix realtime: set replica identity to FULL for filtered subscriptions
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Create call signaling table for WebRTC
CREATE TABLE public.call_signals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  call_type text NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'ended', 'rejected', 'missed')),
  offer jsonb,
  answer jsonb,
  ice_candidates jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own calls"
  ON public.call_signals FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls as caller"
  ON public.call_signals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Call participants can update"
  ON public.call_signals FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Call participants can delete"
  ON public.call_signals FOR DELETE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Timestamp trigger
CREATE TRIGGER update_call_signals_updated_at
  BEFORE UPDATE ON public.call_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
