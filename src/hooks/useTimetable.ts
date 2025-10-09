import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Period } from '@/types';
import { useToast } from '@/hooks/use-toast';

export interface Timetable {
  id: string;
  user_id: string;
  name: string;
  periods: Period[];
  theme_colors: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export const useTimetable = () => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [currentTimetable, setCurrentTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTimetables();
  }, []);

  const loadTimetables = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('timetables')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const timetables = data.map(t => ({
          ...t,
          periods: t.periods as unknown as Period[],
          theme_colors: (t.theme_colors as unknown as Record<string, string>) || {},
        }));
        setTimetables(timetables);
        setCurrentTimetable(timetables[0]);
      } else {
        // Create default timetable
        await createTimetable('My Timetable', []);
      }
    } catch (error) {
      console.error('Error loading timetables:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timetables',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTimetable = async (name: string, periods: Period[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('timetables')
        .insert({
          user_id: user.id,
          name,
          periods: periods as any,
          theme_colors: {} as any,
        })
        .select()
        .single();

      if (error) throw error;

      const timetable: Timetable = {
        ...data,
        periods: data.periods as unknown as Period[],
        theme_colors: (data.theme_colors as unknown as Record<string, string>) || {},
      };

      setTimetables([...timetables, timetable]);
      setCurrentTimetable(timetable);
      
      toast({
        title: 'Success',
        description: 'Timetable created',
      });

      return data;
    } catch (error) {
      console.error('Error creating timetable:', error);
      toast({
        title: 'Error',
        description: 'Failed to create timetable',
        variant: 'destructive',
      });
    }
  };

  const updateTimetable = async (id: string, updates: Partial<Timetable>) => {
    try {
      const dbUpdates = {
        ...updates,
        periods: updates.periods as any,
        theme_colors: updates.theme_colors as any,
      };

      const { data, error } = await supabase
        .from('timetables')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const timetable: Timetable = {
        ...data,
        periods: data.periods as unknown as Period[],
        theme_colors: (data.theme_colors as unknown as Record<string, string>) || {},
      };

      setTimetables(timetables.map(t => t.id === id ? timetable : t));
      if (currentTimetable?.id === id) {
        setCurrentTimetable(timetable);
      }
    } catch (error) {
      console.error('Error updating timetable:', error);
      toast({
        title: 'Error',
        description: 'Failed to update timetable',
        variant: 'destructive',
      });
    }
  };

  const updatePeriods = async (periods: Period[]) => {
    if (!currentTimetable) return;
    await updateTimetable(currentTimetable.id, { periods });
  };

  const updateThemeColors = async (themeColors: Record<string, string>) => {
    if (!currentTimetable) return;
    await updateTimetable(currentTimetable.id, { theme_colors: themeColors });
  };

  return {
    timetables,
    currentTimetable,
    loading,
    createTimetable,
    updateTimetable,
    updatePeriods,
    updateThemeColors,
    setCurrentTimetable,
  };
};
