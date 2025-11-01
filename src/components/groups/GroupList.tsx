import React, { useEffect, useState } from 'react';
import { Group } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface GroupListProps {
  groups: Group[];
  loading: boolean;
  selectedGroup: Group | null;
  onSelectGroup: (group: Group) => void;
}

interface GroupWithLastMessage extends Group {
  lastMessage?: {
    content: string;
    created_at: string;
  };
}

export const GroupList = ({ groups, loading, selectedGroup, onSelectGroup }: GroupListProps) => {
  const [groupsWithMessages, setGroupsWithMessages] = useState<GroupWithLastMessage[]>([]);

  useEffect(() => {
    const fetchLastMessages = async () => {
      const updatedGroups = await Promise.all(
        groups.map(async (group) => {
          const { data } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...group,
            lastMessage: data || undefined,
          };
        })
      );

      setGroupsWithMessages(updatedGroups);
    };

    if (groups.length > 0) {
      fetchLastMessages();
    } else {
      setGroupsWithMessages([]);
    }
  }, [groups]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-4">
        <p className="text-center">No groups yet. Create one to get started!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2">
        {groupsWithMessages.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group)}
            className={`w-full p-3 rounded-lg flex items-start gap-3 hover:bg-accent transition-colors ${
              selectedGroup?.id === group.id ? 'bg-accent' : ''
            }`}
          >
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={group.avatar_url} />
              <AvatarFallback>{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold truncate">{group.name}</h3>
                {group.lastMessage && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(group.lastMessage.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {group.lastMessage?.content || group.description || 'No messages yet'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};
