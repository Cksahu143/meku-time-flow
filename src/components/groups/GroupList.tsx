import React, { useEffect, useState } from 'react';
import { Group } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
  };
}

export const GroupList = ({ groups, loading, selectedGroup, onSelectGroup, isDisabled }: GroupListProps) => {
  const [groupsWithMessages, setGroupsWithMessages] = useState<GroupWithLastMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredGroups = groupsWithMessages.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredGroups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group)}
            disabled={isDisabled}
            className={cn(
              `w-full p-3 rounded-lg flex items-start gap-3 transition-colors`,
              selectedGroup?.id === group.id ? 'bg-accent' : '',
              isDisabled 
                ? 'opacity-50 cursor-not-allowed hover:bg-transparent' 
                : 'hover:bg-accent'
            )}
          >
            <div className="relative">
              <Avatar className={cn("h-12 w-12 flex-shrink-0", isDisabled && "grayscale")}>
                <AvatarImage src={group.avatar_url} />
                <AvatarFallback>{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {isDisabled && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className={cn("font-semibold truncate", isDisabled && "text-muted-foreground")}>{group.name}</h3>
                {group.lastMessage && !isDisabled && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDistanceToNow(new Date(group.lastMessage.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {isDisabled 
                  ? 'Enable public profile to access'
                  : group.lastMessage?.content || group.description || 'No messages yet'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
    </div>
  );
};