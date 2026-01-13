-- Phase 3: Schools table for school-scoped management
CREATE TABLE public.schools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text UNIQUE NOT NULL,
    address text,
    phone text,
    email text,
    logo_url text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schools table
CREATE POLICY "Platform admins can manage all schools"
ON public.schools
FOR ALL
USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can view their school"
ON public.schools
FOR SELECT
USING (
    id IN (
        SELECT school_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND school_id IS NOT NULL
    )
);

CREATE POLICY "Teachers and students can view their school"
ON public.schools
FOR SELECT
USING (
    id IN (
        SELECT school_id FROM public.user_roles 
        WHERE user_id = auth.uid() AND school_id IS NOT NULL
    )
);

-- Add foreign key to user_roles for school_id
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL;

-- Update RLS policy for school admins to manage roles in their school
DROP POLICY IF EXISTS "School admins can manage roles in their school" ON public.user_roles;

CREATE POLICY "School admins can update roles in their school"
ON public.user_roles
FOR UPDATE
USING (
    public.has_role(auth.uid(), 'school_admin')
    AND school_id IN (
        SELECT ur.school_id FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.school_id IS NOT NULL
    )
    AND role IN ('student', 'teacher')
)
WITH CHECK (
    role IN ('student', 'teacher')
);

CREATE POLICY "School admins can insert roles in their school"
ON public.user_roles
FOR INSERT
WITH CHECK (
    public.has_role(auth.uid(), 'school_admin')
    AND school_id IN (
        SELECT ur.school_id FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.school_id IS NOT NULL
    )
    AND role IN ('student', 'teacher')
);

-- Insert a sample school for testing
INSERT INTO public.schools (name, code, email) 
VALUES ('Demo School', 'DEMO001', 'demo@school.edu');

-- Create trigger for updated_at on schools
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();