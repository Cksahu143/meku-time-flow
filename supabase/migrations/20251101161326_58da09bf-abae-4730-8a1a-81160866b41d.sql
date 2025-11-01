-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of groups they are in" ON public.group_members;
DROP POLICY IF EXISTS "Group members can create invitations" ON public.group_invitations;
DROP POLICY IF EXISTS "Group members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Group members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Group members can view typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Group members can update their typing status" ON public.typing_indicators;

-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view members of groups they are in"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can create invitations"
  ON public.group_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    public.is_group_member(auth.uid(), group_id)
  );

CREATE POLICY "Group members can view messages"
  ON public.messages FOR SELECT
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_group_member(auth.uid(), group_id)
  );

CREATE POLICY "Group members can view typing indicators"
  ON public.typing_indicators FOR SELECT
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group members can update their typing status"
  ON public.typing_indicators FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_group_member(auth.uid(), group_id)
  );