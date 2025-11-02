-- Create a SECURITY DEFINER function to check if a user is the creator of a group
create or replace function public.is_group_creator(_user_id uuid, _group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups g
    where g.id = _group_id and g.created_by = _user_id
  );
$$;

-- Allow creators to view their groups (needed for immediate reads after creation and for policies that reference groups)
DROP POLICY IF EXISTS "Creators can view their groups" ON public.groups;
CREATE POLICY "Creators can view their groups"
ON public.groups
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Update group_members policy to avoid RLS recursion on groups by using the definer function
DROP POLICY IF EXISTS "Group creators can add themselves as admin" ON public.group_members;
CREATE POLICY "Group creators can add themselves as admin"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) AND public.is_group_creator(auth.uid(), group_id)
);

-- Ensure existing membership-based select still works
DROP POLICY IF EXISTS "Users can view members of groups they are in" ON public.group_members;
CREATE POLICY "Users can view members of groups they are in"
ON public.group_members
FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

-- Recreate messages/typing indicator policies to reference the stable function (idempotent safety)
DROP POLICY IF EXISTS "Group members can send messages" ON public.messages;
CREATE POLICY "Group members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND public.is_group_member(auth.uid(), group_id));

DROP POLICY IF EXISTS "Group members can view messages" ON public.messages;
CREATE POLICY "Group members can view messages"
ON public.messages
FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

DROP POLICY IF EXISTS "Group members can update their typing status" ON public.typing_indicators;
CREATE POLICY "Group members can update their typing status"
ON public.typing_indicators
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND public.is_group_member(auth.uid(), group_id));

DROP POLICY IF EXISTS "Group members can view typing indicators" ON public.typing_indicators;
CREATE POLICY "Group members can view typing indicators"
ON public.typing_indicators
FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

DROP POLICY IF EXISTS "Users can update their typing status" ON public.typing_indicators;
CREATE POLICY "Users can update their typing status"
ON public.typing_indicators
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
