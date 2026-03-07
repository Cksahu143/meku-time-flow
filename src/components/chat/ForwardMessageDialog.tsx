import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Check, Loader2, Image, FileText, Mic } from 'lucide-react';
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
  open, onOpenChange, message, currentUserId
}) => {
  const [targets, setTargets] = useState<ForwardTarget[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchTargets();
  }, [open]);

  const fetchTargets = async () => {
    setLoading(true);
    const allTargets: ForwardTarget[] = [];

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', currentUserId);

    if (memberships) {
      const groupIds = memberships.map(m => m.group_id);
      if (groupIds.length > 0) {
        const { data: groups } = await supabase
          .from('groups')
          .select('id, name, avatar_url')
          .in('id', groupIds);
        if (groups) {
          groups.forEach(g => {
            allTargets.push({ id: g.id, name: g.name, avatar: g.avatar_url || undefined, type: 'group' });
          });
        }
      }
    }

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
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  const getMessagePreview = () => {
    if (!message) return '';
    if (message.voice_url) return '🎤 Voice message';
    if (message.file_url && message.file_type?.startsWith('image/')) return '📷 Photo';
    if (message.file_url) return `📎 ${message.file_name || 'File'}`;
    return message.content.length > 60 ? message.content.slice(0, 60) + '…' : message.content;
  };

  const getMessagePreviewIcon = () => {
    if (!message) return null;
    if (message.voice_url) return <Mic className="h-4 w-4 text-primary" />;
    if (message.file_url && message.file_type?.startsWith('image/')) return <Image className="h-4 w-4 text-primary" />;
    if (message.file_url) return <FileText className="h-4 w-4 text-primary" />;
    return null;
  };

  const handleForward = async () => {
    if (!message || selectedTargets.size === 0) return;
    setForwarding(true);

    try {
      for (const targetId of selectedTargets) {
        const target = targets.find(t => t.id === targetId);
        if (!target) continue;

        // Build the forwarded message data preserving all media fields
        const baseContent = message.voice_url ? '🎤 Voice message' :
          message.file_url ? (message.file_name || 'File') :
          message.content;
        const forwardedContent = `📨 Forwarded: ${baseContent}`;

        if (target.type === 'group') {
          const insertData: Record<string, any> = {
            group_id: targetId,
            user_id: currentUserId,
            content: forwardedContent,
          };
          // Preserve media fields
          if (message.file_url) {
            insertData.file_url = message.file_url;
            insertData.file_name = message.file_name;
            insertData.file_type = message.file_type;
            insertData.file_size = message.file_size;
          }
          if (message.voice_url) {
            insertData.voice_url = message.voice_url;
            insertData.voice_duration = message.voice_duration;
          }
          if (message.link_url) {
            insertData.link_url = message.link_url;
            insertData.link_title = message.link_title;
            insertData.link_description = message.link_description;
            insertData.link_image = message.link_image;
          }
          await supabase.from('messages').insert(insertData);
        } else {
          const insertData: Record<string, any> = {
            conversation_id: targetId,
            sender_id: currentUserId,
            content: forwardedContent,
          };
          // Preserve media fields
          if (message.file_url) {
            insertData.file_url = message.file_url;
            insertData.file_name = message.file_name;
            insertData.file_type = message.file_type;
            insertData.file_size = message.file_size;
          }
          if (message.voice_url) {
            insertData.voice_url = message.voice_url;
            insertData.voice_duration = message.voice_duration;
          }
          if (message.link_url) {
            insertData.link_url = message.link_url;
            insertData.link_title = message.link_title;
            insertData.link_description = message.link_description;
            insertData.link_image = message.link_image;
          }
          await supabase.from('direct_messages').insert(insertData);
        }
      }

      toast({ title: 'Forwarded', description: `Message forwarded to ${selectedTargets.size} chat(s)` });
      setSelectedTargets(new Set());
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to forward message', variant: 'destructive' });
    } finally {
      setForwarding(false);
    }
  };

  const filteredTargets = targets.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
              className="pl-9 bg-muted/50 border-0 rounded-xl"
            />
          </div>

          {/* Message Preview - now shows media type */}
          {message && (
            <div className="p-3 bg-muted/50 rounded-xl border border-border/50 flex items-center gap-3">
              {message.file_url && message.file_type?.startsWith('image/') && (
                <img src={message.file_url} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
              )}
              {getMessagePreviewIcon() && !message.file_type?.startsWith('image/') && (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {getMessagePreviewIcon()}
                </div>
              )}
              <p className="text-sm text-foreground line-clamp-2 flex-1">{getMessagePreview()}</p>
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
              <div className="space-y-0.5 px-1">
                {filteredTargets.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => toggleTarget(target.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                      selectedTargets.has(target.id)
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={target.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {target.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{target.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{target.type}</p>
                    </div>
                    {selectedTargets.has(target.id) && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleForward}
              disabled={selectedTargets.size === 0 || forwarding}
              className="rounded-xl"
            >
              {forwarding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Forward {selectedTargets.size > 0 && `(${selectedTargets.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
