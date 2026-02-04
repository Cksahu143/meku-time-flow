-- 1) Helper: fetch the caller's school_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 2) Fix infinite recursion on public.user_roles policies by removing self-referencing subqueries
DROP POLICY IF EXISTS "School admins can insert roles in their school" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can update roles in their school" ON public.user_roles;
DROP POLICY IF EXISTS "School admins can view roles in their school" ON public.user_roles;

CREATE POLICY "School admins can view roles in their school"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'school_admin'::public.app_role)
  AND school_id IS NOT NULL
  AND school_id = public.current_user_school_id()
);

CREATE POLICY "School admins can insert roles in their school"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'school_admin'::public.app_role)
  AND school_id IS NOT NULL
  AND school_id = public.current_user_school_id()
  AND role = ANY (ARRAY['student'::public.app_role, 'teacher'::public.app_role])
);

CREATE POLICY "School admins can update roles in their school"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'school_admin'::public.app_role)
  AND school_id IS NOT NULL
  AND school_id = public.current_user_school_id()
)
WITH CHECK (
  school_id IS NOT NULL
  AND school_id = public.current_user_school_id()
  AND role = ANY (ARRAY['student'::public.app_role, 'teacher'::public.app_role])
);

-- 3) Fix schools SELECT policies that referenced user_roles (which triggered recursion)
DROP POLICY IF EXISTS "School admins can view their school" ON public.schools;
DROP POLICY IF EXISTS "Teachers and students can view their school" ON public.schools;

CREATE POLICY "Users can view their assigned school"
ON public.schools
FOR SELECT
TO authenticated
USING (
  public.current_user_school_id() IS NOT NULL
  AND id = public.current_user_school_id()
);
