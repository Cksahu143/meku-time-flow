import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DirectMessage } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useDirectMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`direct-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as DirectMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content: string, replyToId?: string) => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const messageData: any = {
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      };

      if (replyToId) {
        messageData.reply_to_message_id = replyToId;
      }

      // Check for URLs and extract first one for preview
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = content.match(urlRegex);
      if (urls && urls.length > 0) {
        try {
          const url = new URL(urls[0]);
          messageData.link_url = urls[0];
          messageData.link_title = url.hostname;
          messageData.link_description = urls[0];
        } catch {}
      }

      const { error } = await supabase.from('direct_messages').insert(messageData);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `${user.id}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Store the path instead of full URL for RLS policy compatibility
      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: '[Voice Message]',
        voice_url: uploadData.path,
        voice_duration: duration,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send voice message',
        variant: 'destructive',
      });
    }
  };

  const sendFileMessage = async (file: File) => {
    if (!conversationId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(uploadData.path);

      const { error } = await supabase.from('direct_messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: file.type.startsWith('image/') ? '[Image]' : `[${file.name}]`,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending file:', error);
      toast({
        title: 'Error',
        description: 'Failed to send file',
        variant: 'destructive',
      });
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const updateData: Record<string, any> = {
        content: newContent,
        edited_at: new Date().toISOString(),
      };

      // Re-parse links on edit
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = newContent.match(urlRegex);
      if (urls && urls.length > 0) {
        try {
          const url = new URL(urls[0]);
          updateData.link_url = urls[0];
          updateData.link_title = url.hostname;
          updateData.link_description = urls[0];
        } catch {
          updateData.link_url = null;
          updateData.link_title = null;
          updateData.link_description = null;
          updateData.link_image = null;
        }
      } else {
        updateData.link_url = null;
        updateData.link_title = null;
        updateData.link_description = null;
        updateData.link_image = null;
      }

      const { error } = await supabase
        .from('direct_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) throw error;

      setMessages((current) =>
        current.map((msg) =>
          msg.id === messageId
            ? { ...msg, ...updateData }
            : msg
        )
      );
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive',
      });
    }
  };

  const deleteMessage = async (messageId: string, voiceUrl?: string) => {
    try {
      if (voiceUrl) {
        const path = voiceUrl.split('/').pop();
        if (path) {
          await supabase.storage.from('voice-messages').remove([path]);
        }
      }

      const { error } = await supabase
        .from('direct_messages')
        .update({ is_deleted: true, content: '[Message deleted]' })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((current) =>
        current.map((msg) =>
          msg.id === messageId
            ? { ...msg, is_deleted: true, content: '[Message deleted]' }
            : msg
        )
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
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
