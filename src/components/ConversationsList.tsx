import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { MessageSquare, Search } from 'lucide-react';

interface ConversationsListProps {
  conversations: Conversation[];
  loading: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (conversation: Conversation, otherUserId: string) => void;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string;
  avatar_url: string | null;
}

export const ConversationsList = ({
  conversations,
  loading,
  selectedConversationId,
  onSelectConversation,
}: ConversationsListProps) => {
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
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

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, email, avatar_url')
        .in('id', otherUserIds);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      const profilesMap: Record<string, UserProfile> = {};
      data.forEach((profile) => {
        profilesMap[profile.id] = profile;
      });
      setProfiles(profilesMap);
    };

    fetchProfiles();
  }, [conversations, currentUserId]);

  if (loading) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-4 text-center text-muted-foreground">Loading conversations...</div>
      </ScrollArea>
    );
  }

  if (conversations.length === 0) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-4 text-center text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No conversations yet</p>
          <p className="text-sm">Start a chat from Active Users</p>
        </div>
      </ScrollArea>
    );
  }

  const filteredConversations = conversations.filter((conversation) => {
    const otherUserId =
      conversation.user1_id === currentUserId
        ? conversation.user2_id
        : conversation.user1_id;
    const profile = profiles[otherUserId];
    const userName = profile?.display_name || profile?.username || profile?.email || '';
    return userName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.map((conversation) => {
          const otherUserId =
            conversation.user1_id === currentUserId
              ? conversation.user2_id
              : conversation.user1_id;
          const profile = profiles[otherUserId];
          const isSelected = conversation.id === selectedConversationId;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation, otherUserId)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                isSelected
                  ? 'bg-primary/10 border-primary'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.display_name?.charAt(0).toUpperCase() ||
                      profile?.username?.charAt(0).toUpperCase() ||
                      profile?.email?.charAt(0).toUpperCase() ||
                      '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {profile?.display_name || profile?.username || profile?.email || 'User'}
                  </p>
                  {conversation.last_message_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(conversation.last_message_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
    </div>
  );
};
