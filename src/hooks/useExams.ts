import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Exam {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  start_date: string;
  start_time: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchExams = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setExams([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      console.error('Error fetching exams:', error);
      toast({
        title: 'Error loading exams',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createExam = async (exam: Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('exams')
        .insert({
          ...exam,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setExams((prev) => [...prev, data].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ));
      toast({
        title: 'Exam created',
        description: `"${exam.title}" has been added to your calendar.`,
      });
      return data;
    } catch (error: any) {
      console.error('Error creating exam:', error);
      toast({
        title: 'Error creating exam',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateExam = async (id: string, updates: Partial<Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setExams((prev) => 
        prev.map((e) => (e.id === id ? data : e))
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      );
      return data;
    } catch (error: any) {
      console.error('Error updating exam:', error);
      toast({
        title: 'Error updating exam',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteExam = async (id: string) => {
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setExams((prev) => prev.filter((e) => e.id !== id));
      toast({
        title: 'Exam deleted',
        description: 'The exam has been removed from your calendar.',
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting exam:', error);
      toast({
        title: 'Error deleting exam',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Check if exam spans a specific date
  const examSpansDate = (exam: Exam, date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const startDate = exam.start_date;
    const endDate = exam.end_date || exam.start_date;
    return dateStr >= startDate && dateStr <= endDate;
  };

  // Get exams for a specific date (including multi-day exams)
  const getExamsForDate = (date: Date): Exam[] => {
    return exams.filter((exam) => examSpansDate(exam, date));
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchExams();

    const channel = supabase
      .channel('exams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
        },
        () => {
          fetchExams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchExams]);

  return {
    exams,
    loading,
    createExam,
    updateExam,
    deleteExam,
    getExamsForDate,
    refetch: fetchExams,
  };
}
