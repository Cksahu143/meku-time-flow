
CREATE TABLE public.saved_ai_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tool_type TEXT NOT NULL,
  input_context TEXT NOT NULL DEFAULT '',
  ai_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  subject TEXT NOT NULL DEFAULT '',
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  resource_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_ai_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved results"
  ON public.saved_ai_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved results"
  ON public.saved_ai_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved results"
  ON public.saved_ai_results FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved results"
  ON public.saved_ai_results FOR UPDATE
  USING (auth.uid() = user_id);
