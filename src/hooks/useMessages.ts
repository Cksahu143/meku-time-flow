import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useMessageCache } from './useMessageCache';

export const useMessages = (groupId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getCachedData, setCachedData } = useMessageCache(groupId);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchMessages = async () => {
    if (!groupId) return;

    // Try to load from cache first
    const cached = getCachedData();
    if (cached) {
      setMessages(cached.messages);
      setLoading(false);
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const fetchedMessages = data || [];
      setMessages(fetchedMessages);
      
      // Update cache with fresh data
      setCachedData(fetchedMessages, {});
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!groupId || !content.trim()) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert([{ group_id: groupId, user_id: user.id, content: content.trim() }]);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!groupId) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from('messages')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          content: 'Voice message',
          voice_url: fileName,
          voice_duration: duration
        }]);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sendFileMessage = async (file: File) => {
    if (!groupId) return;

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${groupId}/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from('messages')
        .insert([{
          group_id: groupId,
          user_id: user.id,
          content: file.name,
          file_url: fileName,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        }]);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent.trim(), edited_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: newContent.trim(), edited_at: new Date().toISOString() }
          : msg
      ));

      toast({
        title: 'Success',
        description: 'Message updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteMessage = async (messageId: string, voiceUrl?: string) => {
    try {
      if (voiceUrl) {
        await supabase.storage
          .from('voice-messages')
          .remove([voiceUrl]);
      }

      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, content: 'Message deleted' })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, is_deleted: true, content: 'Message deleted' }
          : msg
      ));

      toast({
        title: 'Success',
        description: 'Message deleted',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    sendVoiceMessage,
    sendFileMessage,
    editMessage,
    deleteMessage,
  };
};
