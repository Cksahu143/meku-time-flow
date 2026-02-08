-- =====================
-- ANNOUNCEMENTS TABLE
-- =====================
CREATE TABLE public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
    created_by uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers', 'staff')),
    is_pinned boolean NOT NULL DEFAULT false,
    expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Platform admins can manage all announcements"
ON public.announcements FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can manage their school announcements"
ON public.announcements FOR ALL
USING (
    has_role(auth.uid(), 'school_admin') 
    AND school_id = current_user_school_id()
)
WITH CHECK (
    has_role(auth.uid(), 'school_admin') 
    AND school_id = current_user_school_id()
);

CREATE POLICY "Teachers can create announcements for their school"
ON public.announcements FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'teacher') 
    AND school_id = current_user_school_id()
    AND created_by = auth.uid()
);

CREATE POLICY "Teachers can update their own announcements"
ON public.announcements FOR UPDATE
USING (
    has_role(auth.uid(), 'teacher') 
    AND created_by = auth.uid()
);

CREATE POLICY "Users can view announcements for their school"
ON public.announcements FOR SELECT
USING (
    school_id = current_user_school_id()
    OR school_id IS NULL  -- Platform-wide announcements
);

-- =====================
-- ATTENDANCE TABLE
-- =====================
CREATE TABLE public.attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    student_id uuid NOT NULL,
    marked_by uuid NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
    notes text,
    period_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(school_id, student_id, date, period_id)
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance
CREATE POLICY "Platform admins can manage all attendance"
ON public.attendance FOR ALL
USING (has_role(auth.uid(), 'platform_admin'))
WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can manage their school attendance"
ON public.attendance FOR ALL
USING (
    has_role(auth.uid(), 'school_admin') 
    AND school_id = current_user_school_id()
)
WITH CHECK (
    has_role(auth.uid(), 'school_admin') 
    AND school_id = current_user_school_id()
);

CREATE POLICY "Teachers can mark attendance for their school"
ON public.attendance FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'teacher') 
    AND school_id = current_user_school_id()
    AND marked_by = auth.uid()
);

CREATE POLICY "Teachers can update attendance they marked"
ON public.attendance FOR UPDATE
USING (
    has_role(auth.uid(), 'teacher') 
    AND marked_by = auth.uid()
);

CREATE POLICY "Teachers can view attendance for their school"
ON public.attendance FOR SELECT
USING (
    (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'school_admin'))
    AND school_id = current_user_school_id()
);

CREATE POLICY "Students can view their own attendance"
ON public.attendance FOR SELECT
USING (student_id = auth.uid());

-- =====================
-- ANALYTICS EVENTS TABLE
-- =====================
CREATE TABLE public.analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id uuid,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all analytics"
ON public.analytics_events FOR SELECT
USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "School admins can view their school analytics"
ON public.analytics_events FOR SELECT
USING (
    has_role(auth.uid(), 'school_admin') 
    AND school_id = current_user_school_id()
);

CREATE POLICY "Authenticated users can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- =====================
-- INDEXES FOR PERFORMANCE
-- =====================
CREATE INDEX idx_announcements_school_id ON public.announcements(school_id);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX idx_attendance_school_date ON public.attendance(school_id, date);
CREATE INDEX idx_attendance_student ON public.attendance(student_id, date);
CREATE INDEX idx_analytics_school_type ON public.analytics_events(school_id, event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics_events(created_at DESC);

-- =====================
-- UPDATE TRIGGERS
-- =====================
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();