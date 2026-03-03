import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

export interface ExamPeriod {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type DayType = 'exam' | 'prep_leave' | 'holiday' | 'half_day';

export interface ExamPeriodDay {
  id: string;
  period_id: string;
  user_id: string;
  date: string;
  day_type: DayType;
  exam_title: string | null;
  exam_subject: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useExamPeriods() {
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [periodDays, setPeriodDays] = useState<ExamPeriodDay[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPeriods([]); setPeriodDays([]); setLoading(false); return; }

      const [periodsRes, daysRes] = await Promise.all([
        supabase.from('exam_periods').select('*').order('start_date'),
        supabase.from('exam_period_days').select('*').order('date'),
      ]);

      if (periodsRes.error) throw periodsRes.error;
      if (daysRes.error) throw daysRes.error;

      setPeriods(periodsRes.data || []);
      setPeriodDays((daysRes.data || []).map(d => ({ ...d, day_type: d.day_type as DayType })));
    } catch (error: any) {
      console.error('Error fetching exam periods:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPeriod = async (
    name: string,
    startDate: Date,
    endDate: Date,
    description?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('exam_periods')
        .insert({
          user_id: user.id,
          name,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-generate day entries for each day in range
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const dayEntries = days.map((d) => ({
        period_id: data.id,
        user_id: user.id,
        date: format(d, 'yyyy-MM-dd'),
        day_type: 'exam' as DayType,
      }));

      const { error: daysError } = await supabase.from('exam_period_days').insert(dayEntries);
      if (daysError) throw daysError;

      toast({ title: 'Exam period created', description: `${days.length} days generated for "${name}"` });
      await fetchAll();
      return data;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return null;
    }
  };

  const updateDay = async (dayId: string, updates: Partial<Pick<ExamPeriodDay, 'day_type' | 'exam_title' | 'exam_subject' | 'start_time' | 'end_time' | 'notes'>>) => {
    try {
      const { data, error } = await supabase
        .from('exam_period_days')
        .update(updates)
        .eq('id', dayId)
        .select()
        .single();

      if (error) throw error;
      setPeriodDays((prev) => prev.map((d) => (d.id === dayId ? { ...data, day_type: data.day_type as DayType } : d)));
      return data;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating day', description: error.message });
      return null;
    }
  };

  const deletePeriod = async (periodId: string) => {
    try {
      const { error } = await supabase.from('exam_periods').delete().eq('id', periodId);
      if (error) throw error;
      setPeriods((prev) => prev.filter((p) => p.id !== periodId));
      setPeriodDays((prev) => prev.filter((d) => d.period_id !== periodId));
      toast({ title: 'Exam period deleted' });
      return true;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return false;
    }
  };

  const getDaysForPeriod = (periodId: string) => periodDays.filter((d) => d.period_id === periodId);

  const getDayForDate = (dateStr: string) => periodDays.filter((d) => d.date === dateStr);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { periods, periodDays, loading, createPeriod, updateDay, deletePeriod, getDaysForPeriod, getDayForDate, refetch: fetchAll };
}
