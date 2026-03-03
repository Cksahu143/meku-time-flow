
-- Exam Periods: parent container for a block of exam days
CREATE TABLE public.exam_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exam periods" ON public.exam_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own exam periods" ON public.exam_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exam periods" ON public.exam_periods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exam periods" ON public.exam_periods FOR DELETE USING (auth.uid() = user_id);

-- Exam Period Days: individual day slots within a period
CREATE TABLE public.exam_period_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES public.exam_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  day_type TEXT NOT NULL DEFAULT 'exam' CHECK (day_type IN ('exam', 'prep_leave', 'holiday', 'half_day')),
  exam_title TEXT,
  exam_subject TEXT,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_id, date)
);

ALTER TABLE public.exam_period_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exam period days" ON public.exam_period_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own exam period days" ON public.exam_period_days FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exam period days" ON public.exam_period_days FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exam period days" ON public.exam_period_days FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_exam_periods_updated_at BEFORE UPDATE ON public.exam_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_exam_period_days_updated_at BEFORE UPDATE ON public.exam_period_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
