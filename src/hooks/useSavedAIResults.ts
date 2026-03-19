import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedAIResult {
  id: string;
  user_id: string;
  tool_type: string;
  input_context: string;
  ai_output: any;
  subject: string;
  resource_id: string | null;
  resource_title: string | null;
  created_at: string;
}

export const useSavedAIResults = () => {
  const [results, setResults] = useState<SavedAIResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await (supabase
      .from('saved_ai_results' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      console.error('Error fetching saved results:', error);
    } else {
      setResults(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const saveResult = async (params: {
    tool_type: string;
    input_context: string;
    ai_output: any;
    subject: string;
    resource_id?: string;
    resource_title?: string;
  }): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await (supabase.from('saved_ai_results' as any) as any).insert({
      user_id: user.id,
      tool_type: params.tool_type,
      input_context: params.input_context,
      ai_output: params.ai_output,
      subject: params.subject,
      resource_id: params.resource_id || null,
      resource_title: params.resource_title || null,
    });

    if (error) {
      console.error('Save error:', error);
      toast.error('Failed to save result');
      return false;
    }

    toast.success('Result saved!');
    await fetchResults();
    return true;
  };

  const deleteResult = async (id: string): Promise<boolean> => {
    const { error } = await (supabase
      .from('saved_ai_results' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete');
      return false;
    }

    setResults(prev => prev.filter(r => r.id !== id));
    toast.success('Deleted');
    return true;
  };

  const checkExisting = async (tool_type: string, resource_id: string): Promise<SavedAIResult | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await (supabase
      .from('saved_ai_results' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('tool_type', tool_type)
      .eq('resource_id', resource_id)
      .order('created_at', { ascending: false })
      .limit(1) as any);

    return data?.[0] || null;
  };

  return { results, loading, saveResult, deleteResult, checkExisting, refetch: fetchResults };
};
