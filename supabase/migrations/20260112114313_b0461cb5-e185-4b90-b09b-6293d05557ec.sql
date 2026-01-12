-- Phase 1: RBAC Foundation - Roles and Permissions Infrastructure

-- Step 1: Create the app_role enum with all planned roles
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'school_admin', 'platform_admin');

-- Step 2: Create the user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    school_id uuid NULL, -- For future school isolation
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Step 3: Create the permissions table
CREATE TABLE public.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Step 4: Create role_permissions junction table
CREATE TABLE public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (role, permission_id)
);

-- Step 5: Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Step 7: Create function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role = rp.role
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = _user_id
          AND p.name = _permission_name
    )
$$;

-- Step 8: Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Step 9: Create function to assign default role on signup
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Assign platform_admin to specific email, otherwise student
    IF NEW.email = 'charukrishna.sahu@gmail.com' THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'platform_admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    END IF;
    RETURN NEW;
END;
$$;

-- Step 10: Create trigger for default role assignment
CREATE TRIGGER on_auth_user_created_assign_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- Step 11: Insert all permissions
INSERT INTO public.permissions (name, description) VALUES
-- Student permissions (Phase 1)
('can_view_dashboard', 'Can view the main dashboard'),
('can_view_timetable', 'Can view timetable'),
('can_view_calendar', 'Can view calendar'),
('can_view_todo', 'Can view and manage personal to-do list'),
('can_view_pomodoro', 'Can use pomodoro timer'),
('can_view_groups', 'Can view and use study chat'),
('can_view_resources', 'Can view resources'),
('can_view_transcribe', 'Can use transcription feature'),
('can_submit_assignments', 'Can submit assignments'),
('can_view_grades', 'Can view own grades'),
('can_view_announcements', 'Can view announcements'),

-- Teacher permissions (Phase 2)
('can_create_classwork', 'Can create and edit classwork'),
('can_grade_submissions', 'Can grade student submissions'),
('can_mark_attendance', 'Can mark student attendance'),
('can_post_announcements', 'Can post class announcements'),
('can_message_students', 'Can message students in assigned classes'),

-- School Admin permissions (Phase 3)
('can_manage_students', 'Can add/edit/remove students'),
('can_manage_teachers', 'Can add/edit/remove teachers'),
('can_assign_classes', 'Can assign classes and subjects'),
('can_manage_timetables', 'Can create/edit timetables for school'),
('can_manage_school_calendar', 'Can manage school calendar'),
('can_view_reports', 'Can view school reports'),

-- Platform Admin permissions (Phase 4)
('can_manage_schools', 'Can create/edit/delete schools'),
('can_assign_school_admins', 'Can assign school admins'),
('can_manage_subscriptions', 'Can manage subscriptions'),
('can_manage_features', 'Can enable/disable features'),
('can_view_logs', 'Can view platform logs'),
('can_view_analytics', 'Can view platform analytics'),
('can_change_any_role', 'Can change any user role');

-- Step 12: Assign permissions to Student role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'student', id FROM public.permissions WHERE name IN (
    'can_view_dashboard',
    'can_view_timetable',
    'can_view_calendar',
    'can_view_todo',
    'can_view_pomodoro',
    'can_view_groups',
    'can_view_resources',
    'can_view_transcribe',
    'can_submit_assignments',
    'can_view_grades',
    'can_view_announcements'
);

-- Step 13: Assign permissions to Teacher role (includes student permissions + teacher specific)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'teacher', id FROM public.permissions WHERE name IN (
    'can_view_dashboard',
    'can_view_timetable',
    'can_view_calendar',
    'can_view_todo',
    'can_view_pomodoro',
    'can_view_groups',
    'can_view_resources',
    'can_view_transcribe',
    'can_view_announcements',
    'can_create_classwork',
    'can_grade_submissions',
    'can_mark_attendance',
    'can_post_announcements',
    'can_message_students'
);

-- Step 14: Assign permissions to School Admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'school_admin', id FROM public.permissions WHERE name IN (
    'can_view_dashboard',
    'can_view_timetable',
    'can_view_calendar',
    'can_view_todo',
    'can_view_pomodoro',
    'can_view_groups',
    'can_view_resources',
    'can_view_transcribe',
    'can_view_announcements',
    'can_create_classwork',
    'can_grade_submissions',
    'can_mark_attendance',
    'can_post_announcements',
    'can_message_students',
    'can_manage_students',
    'can_manage_teachers',
    'can_assign_classes',
    'can_manage_timetables',
    'can_manage_school_calendar',
    'can_view_reports'
);

-- Step 15: Assign ALL permissions to Platform Admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'platform_admin', id FROM public.permissions;

-- Step 16: RLS policies for user_roles table
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can view roles in their school"
ON public.user_roles
FOR SELECT
USING (
    public.has_role(auth.uid(), 'school_admin') AND 
    school_id = (SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "Platform admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can manage roles in their school"
ON public.user_roles
FOR UPDATE
USING (
    public.has_role(auth.uid(), 'school_admin') AND 
    school_id = (SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) AND
    role IN ('student', 'teacher')
);

-- Step 17: RLS policies for permissions (read-only for all authenticated)
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);

-- Step 18: RLS policies for role_permissions (read-only for all authenticated)
CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Step 19: Assign existing users to student role (except platform admin email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
    CASE WHEN email = 'charukrishna.sahu@gmail.com' THEN 'platform_admin'::app_role ELSE 'student'::app_role END
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;