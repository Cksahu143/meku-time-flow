
-- Fix push_subscriptions for upsert support
ALTER TABLE public.push_subscriptions 
  ADD CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint);

CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Group calls table
CREATE TABLE public.group_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'video',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.group_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view group calls"
ON public.group_calls FOR SELECT
TO authenticated
USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can create group calls"
ON public.group_calls FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by AND is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can update group calls"
ON public.group_calls FOR UPDATE
TO authenticated
USING (is_group_member(auth.uid(), group_id));

-- Group call participants
CREATE TABLE public.group_call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_call_id UUID REFERENCES public.group_calls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_call_id, user_id)
);

ALTER TABLE public.group_call_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group call members can view participants"
ON public.group_call_participants FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.group_calls gc 
  WHERE gc.id = group_call_id 
  AND is_group_member(auth.uid(), gc.group_id)
));

CREATE POLICY "Call creators can add participants"
ON public.group_call_participants FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.group_calls gc 
    WHERE gc.id = group_call_id 
    AND gc.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own participation"
ON public.group_call_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for group call participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_call_participants;
