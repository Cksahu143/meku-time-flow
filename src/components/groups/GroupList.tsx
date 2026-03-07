import React, { useEffect, useState } from 'react';
import { Group } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupListProps {
  groups: Group[];
  loading: boolean;
  selectedGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  isDisabled?: boolean;
}

interface GroupWithLastMessage extends Group {
  lastMessage?: {
    content: string;
    created_at: string;
    voice_url?: string | null;
    file_name?: string | null;
  };
  memberCount?: number;
}

export const GroupList = ({ groups, loading, selectedGroup, onSelectGroup, isDisabled }: GroupListProps) => {
  const [groupsWithMessages, setGroupsWithMessages] = useState<GroupWithLastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLastMessages = async () => {
      const updatedGroups = await Promise.all(
        groups.map(async (group) => {
          const [{ data: msgData }, { count }] = await Promise.all([
            supabase
              .from('messages')
              .select('content, created_at, voice_url, file_name')
              .eq('group_id', group.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id),
          ]);
          return { ...group, lastMessage: msgData || undefined, memberCount: count || 0 };
        })
      );
      setGroupsWithMessages(updatedGroups);
    };

    if (groups.length > 0) fetchLastMessages();
    else setGroupsWithMessages([]);
  }, [groups]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = (group: GroupWithLastMessage) => {
    if (!group.lastMessage) return group.description || 'No messages yet';
    const msg = group.lastMessage;
    if (msg.voice_url) return '🎤 Voice message';
    if (msg.file_name) return `📎 ${msg.file_name}`;
    return msg.content.length > 40 ? msg.content.slice(0, 40) + '…' : msg.content;
  };

  if (loading) {
    return (
      <div className="p-3 space-y-3">
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
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No groups yet</p>
          <p className="text-xs mt-1">Create one to get started!</p>
        </div>
      </div>
    );
  }

  const filteredGroups = groupsWithMessages.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0 rounded-xl h-9 text-sm focus-visible:ring-1"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-1">
          {filteredGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group)}
              disabled={isDisabled}
              className={cn(
                'w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150 border-b border-border/30',
                selectedGroup?.id === group.id ? 'bg-primary/8' : 'hover:bg-muted/40 active:bg-muted/60',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="relative flex-shrink-0">
                <Avatar className={cn('h-12 w-12', isDisabled && 'grayscale')}>
                  <AvatarImage src={group.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {group.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isDisabled && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className={cn('font-semibold text-[15px] truncate', isDisabled && 'text-muted-foreground')}>
                    {group.name}
                  </h3>
                  {group.lastMessage && !isDisabled && (
                    <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                      {formatTime(group.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground truncate leading-tight">
                  {isDisabled ? 'Enable public profile to access' : getLastMessagePreview(group)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
