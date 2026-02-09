-- Create classes table
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    section TEXT,
    academic_year TEXT NOT NULL DEFAULT '2025-2026',
    class_teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    max_students INTEGER DEFAULT 40,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(school_id, name, academic_year)
);

-- Create class_students junction table
CREATE TABLE public.class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    roll_number INTEGER,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'transferred', 'graduated', 'dropped')),
    promoted_to_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    promoted_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(class_id, student_id)
);

-- Create class_subjects for subject-teacher mapping
CREATE TABLE public.class_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    periods_per_week INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(class_id, subject_name)
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- Classes RLS Policies
CREATE POLICY "Platform admins can manage all classes"
ON public.classes FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can manage their school classes"
ON public.classes FOR ALL
USING (has_role(auth.uid(), 'school_admin') AND school_id = current_user_school_id())
WITH CHECK (has_role(auth.uid(), 'school_admin') AND school_id = current_user_school_id());

CREATE POLICY "Teachers can view classes in their school"
ON public.classes FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND school_id = current_user_school_id());

CREATE POLICY "Students can view their classes"
ON public.classes FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.class_students cs
    WHERE cs.class_id = classes.id AND cs.student_id = auth.uid()
));

-- Class Students RLS Policies
CREATE POLICY "Platform admins can manage all class students"
ON public.class_students FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can manage their school class students"
ON public.class_students FOR ALL
USING (has_role(auth.uid(), 'school_admin') AND EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND c.school_id = current_user_school_id()
))
WITH CHECK (has_role(auth.uid(), 'school_admin') AND EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND c.school_id = current_user_school_id()
));

CREATE POLICY "Teachers can view class students in their school"
ON public.class_students FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND c.school_id = current_user_school_id()
));

CREATE POLICY "Students can view their own enrollment"
ON public.class_students FOR SELECT
USING (student_id = auth.uid());

-- Class Subjects RLS Policies
CREATE POLICY "Platform admins can manage all class subjects"
ON public.class_subjects FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can manage their school class subjects"
ON public.class_subjects FOR ALL
USING (has_role(auth.uid(), 'school_admin') AND EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_subjects.class_id AND c.school_id = current_user_school_id()
))
WITH CHECK (has_role(auth.uid(), 'school_admin') AND EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_subjects.class_id AND c.school_id = current_user_school_id()
));

CREATE POLICY "Teachers can view class subjects in their school"
ON public.class_subjects FOR SELECT
USING (has_role(auth.uid(), 'teacher') AND EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = class_subjects.class_id AND c.school_id = current_user_school_id()
));

CREATE POLICY "Students can view their class subjects"
ON public.class_subjects FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.class_students cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE c.id = class_subjects.class_id AND cs.student_id = auth.uid()
));

-- Update attendance to reference class_id instead of just school
ALTER TABLE public.attendance ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- Add updated_at trigger for classes
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();