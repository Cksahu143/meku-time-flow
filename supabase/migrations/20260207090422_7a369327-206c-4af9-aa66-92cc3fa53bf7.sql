-- Revert school admin policies to be scoped to their own school only

-- Drop the platform-wide school admin policies
DROP POLICY IF EXISTS "School admins can select all schools" ON public.schools;
DROP POLICY IF EXISTS "School admins can update all schools" ON public.schools;
DROP POLICY IF EXISTS "School admins can insert schools" ON public.schools;
DROP POLICY IF EXISTS "School admins can delete schools" ON public.schools;

-- School admins can only view their own school
CREATE POLICY "School admins can view their school"
ON public.schools FOR SELECT
USING (
  id = current_user_school_id()
  AND has_role(auth.uid(), 'school_admin'::app_role)
);

-- School admins can update their own school
CREATE POLICY "School admins can update their school"
ON public.schools FOR UPDATE
USING (
  id = current_user_school_id()
  AND has_role(auth.uid(), 'school_admin'::app_role)
)
WITH CHECK (
  id = current_user_school_id()
  AND has_role(auth.uid(), 'school_admin'::app_role)
);

-- Drop platform-wide user_roles policies for school admins
DROP POLICY IF EXISTS "School admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can update all roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can insert all roles" ON public.user_roles;

-- School admins can only view users in their school
CREATE POLICY "School admins can view users in their school"
ON public.user_roles FOR SELECT
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND school_id = current_user_school_id()
);

-- School admins can update users in their school (students and teachers only)
CREATE POLICY "School admins can update users in their school"
ON public.user_roles FOR UPDATE
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND school_id = current_user_school_id()
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND school_id = current_user_school_id()
  AND role = ANY (ARRAY['student'::app_role, 'teacher'::app_role])
);

-- School admins can add users to their school (students and teachers only)
CREATE POLICY "School admins can add users to their school"
ON public.user_roles FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND school_id = current_user_school_id()
  AND role = ANY (ARRAY['student'::app_role, 'teacher'::app_role])
);