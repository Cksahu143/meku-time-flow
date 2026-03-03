
-- Prevent anyone from demoting a platform_admin via RLS
-- Drop the existing platform admin update policy and recreate with protection
DROP POLICY IF EXISTS "Platform admins can update any role" ON public.user_roles;

CREATE POLICY "Platform admins can update any role except demoting platform admins"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'platform_admin'::app_role)
  -- Cannot change a platform_admin's role to something else
  AND (
    role = 'platform_admin'::app_role
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = user_roles.user_id
        AND ur.role = 'platform_admin'::app_role
    )
  )
);

-- Also prevent school admins from updating platform_admin or school_admin roles
DROP POLICY IF EXISTS "School admins can update users in their school" ON public.user_roles;

CREATE POLICY "School admins can update users in their school"
ON public.user_roles
FOR UPDATE
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND school_id = current_user_school_id()
  -- Cannot touch platform_admin or school_admin users
  AND role != 'platform_admin'::app_role
  AND role != 'school_admin'::app_role
)
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND school_id = current_user_school_id()
  AND role = ANY (ARRAY['student'::app_role, 'teacher'::app_role])
);
