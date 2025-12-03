import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Message } from '@/types';
import { cn } from '@/lib/utils';

interface PinnedMessagesProps {
  groupId: string;
  onJumpToMessage?: (messageId: string) => void;
}

interface PinnedMessage {
  id: string;
  message_id: string;
  pinned_by: string;
  created_at: string;
  message?: Message;
}

export const PinnedMessages: React.FC<PinnedMessagesProps> = ({ groupId, onJumpToMessage }) => {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPinnedMessages();

    const channel = supabase
      .channel(`pinned:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: `group_id=eq.${groupId}`
        },
        () => fetchPinnedMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const fetchPinnedMessages = async () => {
    const { data } = await supabase
      .from('pinned_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      // Fetch associated messages
      const messageIds = data.map(p => p.message_id);
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('id', messageIds);

      const pinnedWithMessages = data.map(pinned => ({
        ...pinned,
        message: messages?.find(m => m.id === pinned.message_id)
      }));

      setPinnedMessages(pinnedWithMessages);
    } else {
      setPinnedMessages([]);
    }
    setLoading(false);
  };

  const handleUnpin = async (pinnedId: string) => {
    await supabase.from('pinned_messages').delete().eq('id', pinnedId);
  };

  if (loading || pinnedMessages.length === 0) return null;

  return (
    <div className="border-b bg-muted/30 animate-slide-down">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <div className={cn(
        'overflow-hidden transition-all duration-300',
        expanded ? 'max-h-64' : 'max-h-0'
      )}>
        <div className="p-2 space-y-2 max-h-60 overflow-y-auto">
          {pinnedMessages.map((pinned, index) => (
            <Card 
              key={pinned.id} 
              className="animate-scale-in bg-background"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onJumpToMessage?.(pinned.message_id)}
                    className="flex-1 text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                  >
                    <p className="text-sm line-clamp-2">
                      {pinned.message?.content || 'Message deleted'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pinned {new Date(pinned.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleUnpin(pinned.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
