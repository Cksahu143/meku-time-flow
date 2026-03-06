import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DbResource {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  resource_type: string;
  description: string;
  url: string | null;
  file_name: string | null;
  file_size: number | null;
  content: string | null;
  category: string | null;
  chapter: string | null;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceInput {
  title: string;
  subject: string;
  resource_type: string;
  description: string;
  url?: string;
  file_name?: string;
  file_size?: number;
  content?: string;
  category?: string;
  chapter?: string;
  tags?: string[];
  is_favorite?: boolean;
}

export const useResources = () => {
  const [resources, setResources] = useState<DbResource[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchResources = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await (supabase
      .from('resources' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }) as any);

    if (error) {
      console.error('Error fetching resources:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load resources.' });
    } else {
      setResources(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const uploadFile = async (file: File): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from('resources')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const addResource = async (input: ResourceInput, file?: File | null): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    let fileUrl = input.url;
    let fileName = input.file_name;
    let fileSize = input.file_size;

    if (file) {
      const uploadedUrl = await uploadFile(file);
      if (!uploadedUrl) return false;
      fileUrl = uploadedUrl;
      fileName = file.name;
      fileSize = file.size;
    }

    const { error } = await (supabase.from('resources' as any) as any).insert({
      user_id: user.id,
      title: input.title,
      subject: input.subject,
      resource_type: input.resource_type,
      description: input.description,
      url: fileUrl || null,
      file_name: fileName || null,
      file_size: fileSize || null,
      content: input.content || null,
      category: input.category || null,
      chapter: input.chapter || null,
      tags: input.tags || [],
      is_favorite: false,
    });

    if (error) {
      console.error('Insert error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add resource.' });
      return false;
    }

    await fetchResources();
    return true;
  };

  const updateResource = async (id: string, input: Partial<ResourceInput>, file?: File | null): Promise<boolean> => {
    let updates: Record<string, any> = { ...input, updated_at: new Date().toISOString() };

    if (file) {
      const uploadedUrl = await uploadFile(file);
      if (!uploadedUrl) return false;
      updates.url = uploadedUrl;
      updates.file_name = file.name;
      updates.file_size = file.size;
    }

    const { error } = await (supabase
      .from('resources' as any)
      .update(updates)
      .eq('id', id) as any);

    if (error) {
      console.error('Update error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update resource.' });
      return false;
    }

    await fetchResources();
    return true;
  };

  const deleteResource = async (id: string): Promise<boolean> => {
    const { error } = await (supabase
      .from('resources' as any)
      .delete()
      .eq('id', id) as any);

    if (error) {
      console.error('Delete error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete resource.' });
      return false;
    }

    setResources(prev => prev.filter(r => r.id !== id));
    return true;
  };

  const toggleFavorite = async (id: string): Promise<void> => {
    const resource = resources.find(r => r.id === id);
    if (!resource) return;

    const { error } = await (supabase
      .from('resources' as any)
      .update({ is_favorite: !resource.is_favorite })
      .eq('id', id) as any);

    if (error) {
      console.error('Toggle favorite error:', error);
      return;
    }

    setResources(prev =>
      prev.map(r => r.id === id ? { ...r, is_favorite: !r.is_favorite } : r)
    );
  };

  const deleteAllResources = async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await (supabase
      .from('resources' as any)
      .delete()
      .eq('user_id', user.id) as any);

    if (error) {
      console.error('Delete all error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete resources.' });
      return false;
    }

    setResources([]);
    return true;
  };

  return {
    resources,
    loading,
    addResource,
    updateResource,
    deleteResource,
    toggleFavorite,
    deleteAllResources,
    refetch: fetchResources,
  };
};
