import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types';
import { cn } from '@/lib/utils';

interface ForwardTarget {
  id: string;
  name: string;
  avatar?: string;
  type: 'group' | 'conversation';
}

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  currentUserId: string;
}

export const ForwardMessageDialog: React.FC<ForwardMessageDialogProps> = ({
  open,
  onOpenChange,
  message,
  currentUserId
}) => {
  const [targets, setTargets] = useState<ForwardTarget[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTargets();
    }
  }, [open]);

  const fetchTargets = async () => {
    setLoading(true);
    const allTargets: ForwardTarget[] = [];

    // Fetch groups
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', currentUserId);

    if (memberships) {
      const groupIds = memberships.map(m => m.group_id);
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, avatar_url')
        .in('id', groupIds);

      if (groups) {
        groups.forEach(g => {
          allTargets.push({
            id: g.id,
            name: g.name,
            avatar: g.avatar_url || undefined,
            type: 'group'
          });
        });
      }
    }

    // Fetch conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

    if (conversations) {
      for (const conv of conversations) {
        const otherUserId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('id', otherUserId)
          .maybeSingle();

        if (profile) {
          allTargets.push({
            id: conv.id,
            name: profile.display_name || profile.username || 'User',
            avatar: profile.avatar_url || undefined,
            type: 'conversation'
          });
        }
      }
    }

    setTargets(allTargets);
    setLoading(false);
  };

  const toggleTarget = (targetId: string) => {
    setSelectedTargets(prev => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  };

  const handleForward = async () => {
    if (!message || selectedTargets.size === 0) return;

    setForwarding(true);

    for (const targetId of selectedTargets) {
      const target = targets.find(t => t.id === targetId);
      if (!target) continue;

      const forwardedContent = `📨 Forwarded: ${message.content}`;

      if (target.type === 'group') {
        await supabase.from('messages').insert({
          group_id: targetId,
          user_id: currentUserId,
          content: forwardedContent
        });
      } else {
        await supabase.from('direct_messages').insert({
          conversation_id: targetId,
          sender_id: currentUserId,
          content: forwardedContent
        });
      }
    }

    toast({ title: 'Success', description: `Message forwarded to ${selectedTargets.size} chat(s)` });
    setSelectedTargets(new Set());
    setForwarding(false);
    onOpenChange(false);
  };

  const filteredTargets = targets.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="pl-9"
            />
          </div>

          {/* Message Preview */}
          {message && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm line-clamp-2">{message.content}</p>
            </div>
          )}

          <ScrollArea className="h-64">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredTargets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No chats found</p>
            ) : (
              <div className="space-y-1">
                {filteredTargets.map((target, index) => (
                  <button
                    key={target.id}
                    onClick={() => toggleTarget(target.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors animate-fade-in',
                      selectedTargets.has(target.id)
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted'
                    )}
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={target.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {target.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{target.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{target.type}</p>
                    </div>
                    {selectedTargets.has(target.id) && (
                      <Check className="h-5 w-5 text-primary animate-scale-in" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedTargets.size === 0 || forwarding}
              className="hover-scale"
            >
              {forwarding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Forward ({selectedTargets.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
