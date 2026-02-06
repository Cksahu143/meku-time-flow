-- Update schools table RLS policies to allow school admins to manage ALL schools

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their assigned school" ON public.schools;

-- School admins can view all schools
CREATE POLICY "School admins can select all schools"
ON public.schools FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
);

-- School admins can update all schools
CREATE POLICY "School admins can update all schools"
ON public.schools FOR UPDATE
USING (has_role(auth.uid(), 'school_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'school_admin'::app_role));

-- School admins can insert schools
CREATE POLICY "School admins can insert schools"
ON public.schools FOR INSERT
WITH CHECK (has_role(auth.uid(), 'school_admin'::app_role));

-- School admins can delete schools
CREATE POLICY "School admins can delete schools"
ON public.schools FOR DELETE
USING (has_role(auth.uid(), 'school_admin'::app_role));

-- Also allow school admins to view user roles across all schools for management
DROP POLICY IF EXISTS "School admins can view roles in their school" ON public.user_roles;

CREATE POLICY "School admins can view all roles"
ON public.user_roles FOR SELECT
USING (has_role(auth.uid(), 'school_admin'::app_role));

-- Allow school admins to update roles in any school
DROP POLICY IF EXISTS "School admins can update roles in their school" ON public.user_roles;

CREATE POLICY "School admins can update all roles"
ON public.user_roles FOR UPDATE
USING (has_role(auth.uid(), 'school_admin'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role) 
  AND role = ANY (ARRAY['student'::app_role, 'teacher'::app_role, 'school_admin'::app_role])
);

-- Allow school admins to insert roles
DROP POLICY IF EXISTS "School admins can insert roles in their school" ON public.user_roles;

CREATE POLICY "School admins can insert all roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND role = ANY (ARRAY['student'::app_role, 'teacher'::app_role])
);