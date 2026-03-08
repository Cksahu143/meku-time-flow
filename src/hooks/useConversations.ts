import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      if (data) setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrGetConversation = async (otherUserId: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Order user IDs to match the database constraint
      const [user1, user2] = [user.id, otherUserId].sort();

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .maybeSingle();

      if (existing) {
        return existing.id;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          user1_id: user1,
          user2_id: user2,
        })
        .select('id')
        .single();

      if (error) throw error;
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      // RLS does not allow DELETE on conversations; instead remove from local state
      // and delete all messages in the conversation (soft-delete)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Soft-delete all user's messages in the conversation
      await supabase
        .from('direct_messages')
        .update({ is_deleted: true, content: '[Message deleted]' })
        .eq('conversation_id', conversationId)
        .eq('sender_id', user.id);

      // Remove from local state so UI updates
      setConversations(prev => prev.filter(c => c.id !== conversationId));

      toast({
        title: 'Success',
        description: 'Conversation cleared',
      });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear conversation',
        variant: 'destructive',
      });
    }
  };

  return {
    conversations,
    loading,
    createOrGetConversation,
    deleteConversation,
    refreshConversations: fetchConversations,
  };
};
