-- Fix Platform admin RLS policies for user_roles table
-- Drop and recreate with proper WITH CHECK clauses

-- First drop the existing ALL policy (which doesn't have with_check)
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can view all roles" ON public.user_roles;

-- Create separate policies for each operation with proper WITH CHECK clauses
CREATE POLICY "Platform admins can select all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert any role"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update any role"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete any role"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Fix schools policies similarly
DROP POLICY IF EXISTS "Platform admins can manage all schools" ON public.schools;

CREATE POLICY "Platform admins can select all schools"
ON public.schools
FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can insert schools"
ON public.schools
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update schools"
ON public.schools
FOR UPDATE
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can delete schools"
ON public.schools
FOR DELETE
USING (has_role(auth.uid(), 'platform_admin'::app_role));