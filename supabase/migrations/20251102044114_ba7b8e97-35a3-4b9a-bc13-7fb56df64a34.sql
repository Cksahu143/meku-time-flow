-- Fix RLS policy for groups table to allow authenticated users to create groups
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);