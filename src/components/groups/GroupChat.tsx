import React, { useState, useRef, useEffect } from 'react';
import { Group } from '@/types';
import { useMessages } from '@/hooks/useMessages';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MoreVertical, Users, LogOut, Edit, Trash, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupSettingsDialog } from './GroupSettingsDialog';
import { InviteUsersDialog } from './InviteUsersDialog';
import { TypingIndicator } from './TypingIndicator';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceMessage } from './VoiceMessage';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface GroupChatProps {
  group: Group;
  onUpdateGroup: (groupId: string, name: string, description?: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
}

export const GroupChat = ({ group, onUpdateGroup, onDeleteGroup, onLeaveGroup }: GroupChatProps) => {
  const { messages, loading, sendMessage, sendVoiceMessage, editMessage, deleteMessage } = useMessages(group.id);
  const [newMessage, setNewMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
    fetchProfiles();
    getCurrentUser();
  }, [group.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) setCurrentUserId(user.id);
  };

  const checkAdminStatus = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    setIsAdmin(data?.role === 'admin');
  };

  const fetchProfiles = async () => {
    const userIds = [...new Set(messages.map(m => m.user_id))];
    if (userIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    if (data) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      setProfiles(profileMap);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await sendMessage(newMessage);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = async (value: string) => {
    setNewMessage(value);

    if (!isTyping && value.trim()) {
      setIsTyping(true);
      await updateTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      await updateTypingStatus(false);
    }, 2000);
  };

  const updateTypingStatus = async (typing: boolean) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    await supabase
      .from('typing_indicators')
      .upsert({
        group_id: group.id,
        user_id: user.id,
        is_typing: typing,
      });
  };

  const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
    await sendVoiceMessage(audioBlob, duration);
  };

  const startEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const saveEdit = async (messageId: string) => {
    await editMessage(messageId, editingContent);
    cancelEdit();
  };

  const handleDelete = async (messageId: string, voiceUrl?: string) => {
    await deleteMessage(messageId, voiceUrl);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={group.avatar_url} />
            <AvatarFallback>{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{group.name}</h2>
            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowInvite(true)}>
              <Users className="mr-2 h-4 w-4" />
              Invite Members
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Group
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteGroup(group.id)}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Group
                </DropdownMenuItem>
              </>
            )}
            {!isAdmin && (
              <DropdownMenuItem
                onClick={() => onLeaveGroup(group.id)}
                className="text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Leave Group
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const profile = profiles[message.user_id];
            const isOwnMessage = message.user_id === currentUserId;
            const isEditing = editingMessageId === message.id;

            return (
              <div key={message.id} className="animate-fade-in">
                <div className="flex items-start gap-3 group">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>
                      {profile?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {profile?.display_name || profile?.username || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                        {message.edited_at && ' (edited)'}
                      </span>
                      {isOwnMessage && !message.is_deleted && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!message.voice_url && (
                              <DropdownMenuItem onClick={() => startEdit(message.id, message.content)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(message.id, message.voice_url)}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              saveEdit(message.id);
                            } else if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => saveEdit(message.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="max-w-xl">
                        {message.voice_url && message.voice_duration ? (
                          <VoiceMessage
                            voiceUrl={message.voice_url}
                            duration={message.voice_duration}
                          />
                        ) : (
                          <div className={`rounded-lg px-3 py-2 inline-block ${
                            message.is_deleted ? 'bg-muted/50' : 'bg-muted'
                          }`}>
                            <p className={`text-sm whitespace-pre-wrap break-words ${
                              message.is_deleted ? 'italic text-muted-foreground' : ''
                            }`}>
                              {message.content}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <TypingIndicator groupId={group.id} />
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <VoiceRecorder onSendVoice={handleVoiceSend} />
          <Input
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={handleSend} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GroupSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        group={group}
        onUpdate={onUpdateGroup}
      />

      <InviteUsersDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        groupId={group.id}
      />
    </div>
  );
};
