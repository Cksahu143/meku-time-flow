
-- Create a SECURITY DEFINER function to check student enrollment without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_student_in_class(_student_id uuid, _class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_students
    WHERE student_id = _student_id AND class_id = _class_id AND status = 'active'
  )
$$;

-- Create a function to check if a class belongs to a school without RLS
CREATE OR REPLACE FUNCTION public.class_belongs_to_school(_class_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes WHERE id = _class_id AND school_id = _school_id
  )
$$;

-- Fix classes policies: drop and recreate the student policy
DROP POLICY IF EXISTS "Students can view their classes" ON public.classes;
CREATE POLICY "Students can view their classes" ON public.classes
  FOR SELECT USING (
    is_student_in_class(auth.uid(), id)
  );

-- Fix class_students policies: use the helper function instead of joining classes
DROP POLICY IF EXISTS "School admins can manage their school class students" ON public.class_students;
CREATE POLICY "School admins can manage their school class students" ON public.class_students
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND class_belongs_to_school(class_id, current_user_school_id())
  ) WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND class_belongs_to_school(class_id, current_user_school_id())
  );

DROP POLICY IF EXISTS "Teachers can view class students in their school" ON public.class_students;
CREATE POLICY "Teachers can view class students in their school" ON public.class_students
  FOR SELECT USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND class_belongs_to_school(class_id, current_user_school_id())
  );

-- Also fix class_subjects policies that reference classes
DROP POLICY IF EXISTS "School admins can manage their school class subjects" ON public.class_subjects;
CREATE POLICY "School admins can manage their school class subjects" ON public.class_subjects
  FOR ALL USING (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND class_belongs_to_school(class_id, current_user_school_id())
  ) WITH CHECK (
    has_role(auth.uid(), 'school_admin'::app_role)
    AND class_belongs_to_school(class_id, current_user_school_id())
  );

DROP POLICY IF EXISTS "Teachers can view class subjects in their school" ON public.class_subjects;
CREATE POLICY "Teachers can view class subjects in their school" ON public.class_subjects
  FOR SELECT USING (
    has_role(auth.uid(), 'teacher'::app_role)
    AND class_belongs_to_school(class_id, current_user_school_id())
  );

DROP POLICY IF EXISTS "Students can view their class subjects" ON public.class_subjects;
CREATE POLICY "Students can view their class subjects" ON public.class_subjects
  FOR SELECT USING (
    is_student_in_class(auth.uid(), class_id)
  );
