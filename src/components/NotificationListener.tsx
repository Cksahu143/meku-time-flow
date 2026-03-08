import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

/**
 * Global realtime listener that fires browser (push) notifications
 * for messages, DMs, announcements, and group invitations.
 * Mount once at the app root (inside auth-gated layout).
 */
export function NotificationListener() {
  const { showNotification, requestPermission } = useBrowserNotifications();
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      userIdRef.current = session.user.id;

      // Request permission on first load
      await requestPermission();

      channel = supabase
        .channel('global-notifications')
        // Group messages
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const msg = payload.new as any;
            // Don't notify for own messages
            if (msg.user_id === userIdRef.current) return;

            // Fetch sender name
            const { data: profile } = await supabase
              .from('profiles_secure')
              .select('display_name, username')
              .eq('id', msg.user_id)
              .maybeSingle();

            const senderName = profile?.display_name || profile?.username || 'Someone';
            const content = msg.content?.substring(0, 100) || (msg.file_name ? `📎 ${msg.file_name}` : (msg.voice_url ? '🎤 Voice message' : 'New message'));

            showNotification('messages', `💬 ${senderName}`, content, {
              tag: `msg-${msg.group_id}`,
              url: '/app',
            });
          }
        )
        // Direct messages
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'direct_messages' },
          async (payload) => {
            const msg = payload.new as any;
            if (msg.sender_id === userIdRef.current) return;

            const { data: profile } = await supabase
              .from('profiles_secure')
              .select('display_name, username')
              .eq('id', msg.sender_id)
              .maybeSingle();

            const senderName = profile?.display_name || profile?.username || 'Someone';
            const content = msg.content?.substring(0, 100) || (msg.file_name ? `📎 ${msg.file_name}` : (msg.voice_url ? '🎤 Voice message' : 'New message'));

            showNotification('messages', `✉️ ${senderName}`, content, {
              tag: `dm-${msg.conversation_id}`,
              url: '/app',
            });
          }
        )
        // Announcements
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'announcements' },
          (payload) => {
            const ann = payload.new as any;
            showNotification('announcements', `📢 ${ann.title || 'New Announcement'}`, ann.content?.substring(0, 120) || '', {
              tag: `ann-${ann.id}`,
              url: '/app',
            });
          }
        )
        // Group invitations
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'group_invitations' },
          async (payload) => {
            const inv = payload.new as any;
            // Only notify the invited user
            if (inv.invited_user_id !== userIdRef.current) return;

            const { data: group } = await supabase
              .from('groups')
              .select('name')
              .eq('id', inv.group_id)
              .maybeSingle();

            const groupName = group?.name || 'a group';

            showNotification('groupInvites', '👥 Group Invitation', `You've been invited to join "${groupName}"`, {
              tag: `inv-${inv.id}`,
              url: '/notifhub',
            });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [showNotification, requestPermission]);

  return null; // Render nothing — pure side-effect component
}
