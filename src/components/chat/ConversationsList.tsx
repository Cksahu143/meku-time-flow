import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnlineStatus } from '@/components/chat/OnlineStatus';

interface ConversationsListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (conversation: Conversation, otherUserId: string) => void;
  isDisabled?: boolean;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string;
  avatar_url: string | null;
  last_seen: string | null;
}

interface LastMessage {
  content: string;
  created_at: string;
  sender_id: string;
  voice_url: string | null;
  file_name: string | null;
}

export const ConversationsList = ({
  conversations, loading, selectedConversationId, onSelectConversation, isDisabled,
}: ConversationsListProps) => {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId || conversations.length === 0) return;

    const fetchProfiles = async () => {
      const otherUserIds = conversations.map((conv) =>
        conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id
      );
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, email, avatar_url, last_seen')
        .in('id', otherUserIds);
      if (data) {
        const profilesMap: Record<string, UserProfile> = {};
        data.forEach((p) => { profilesMap[p.id] = p; });
        setProfiles(profilesMap);
      }
    };

    const fetchLastMessages = async () => {
      const msgs: Record<string, LastMessage> = {};
      await Promise.all(
        conversations.map(async (conv) => {
          const { data } = await supabase
            .from('direct_messages')
            .select('content, created_at, sender_id, voice_url, file_name')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) msgs[conv.id] = data;
        })
      );
      setLastMessages(msgs);
    };

    fetchProfiles();
    fetchLastMessages();
  }, [conversations, currentUserId]);

  const isUserOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = (convId: string) => {
    const msg = lastMessages[convId];
    if (!msg) return 'Tap to start chatting';
    if (msg.voice_url) return '🎤 Voice message';
    if (msg.file_name) return `📎 ${msg.file_name}`;
    return msg.content.length > 45 ? msg.content.slice(0, 45) + '…' : msg.content;
  };

  if (loading) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (conversations.length === 0) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-8 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No conversations yet</p>
          <p className="text-xs mt-1">Start a chat from Active Users</p>
        </div>
      </ScrollArea>
    );
  }

  const filteredConversations = conversations.filter((conversation) => {
    const otherUserId = conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;
    const profile = profiles[otherUserId];
    const userName = profile?.display_name || profile?.username || profile?.email || '';
    return userName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col">
      {/* WhatsApp-style search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0 rounded-xl h-9 text-sm focus-visible:ring-1"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-1">
          {filteredConversations.map((conversation) => {
            const otherUserId = conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id;
            const profile = profiles[otherUserId];
            const isSelected = conversation.id === selectedConversationId;
            const lastMsg = lastMessages[conversation.id];

            return (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation, otherUserId)}
                disabled={isDisabled}
                className={cn(
                  'w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150 border-b border-border/30',
                  isSelected ? 'bg-primary/8' : 'hover:bg-muted/40 active:bg-muted/60',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {/* Avatar with online dot */}
                <div className="relative flex-shrink-0">
                  <Avatar className={cn('h-12 w-12', isDisabled && 'grayscale')}>
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(profile?.display_name || profile?.username || profile?.email || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!isDisabled && (
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <OnlineStatus isOnline={isUserOnline(profile?.last_seen || null)} size="sm" showText={false} />
                    </div>
                  )}
                  {isDisabled && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-yellow-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={cn('font-semibold text-[15px] truncate', isDisabled && 'text-muted-foreground')}>
                      {profile?.display_name || profile?.username || profile?.email || 'User'}
                    </p>
                    {lastMsg && !isDisabled && (
                      <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                        {formatTime(lastMsg.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground truncate leading-tight">
                    {isDisabled ? 'Enable public profile to access' : getLastMessagePreview(conversation.id)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
