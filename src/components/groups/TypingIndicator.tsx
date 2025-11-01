import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingIndicatorProps {
  groupId: string;
}

export const TypingIndicator = ({ groupId }: TypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`typing:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = payload.new as any;
            if (data.is_typing) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, display_name')
                .eq('id', data.user_id)
                .single();

              if (profile) {
                setTypingUsers(prev => [
                  ...prev.filter(u => u !== (profile.display_name || profile.username)),
                  profile.display_name || profile.username
                ]);
              }
            } else {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, display_name')
                .eq('id', data.user_id)
                .single();

              if (profile) {
                setTypingUsers(prev =>
                  prev.filter(u => u !== (profile.display_name || profile.username))
                );
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="text-sm text-muted-foreground italic py-2">
      {typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ` and ${typingUsers.length - 2} others` : ''} are typing...`}
    </div>
  );
};
