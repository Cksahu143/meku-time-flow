import React, { useState, useRef, useEffect } from 'react';
import { Group, Message } from '@/types';
import { useMessages } from '@/hooks/useMessages';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MoreVertical, Users, LogOut, Edit, Trash, X, Info, Reply, Pin, Forward } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupSettingsDialog } from './GroupSettingsDialog';
import { GroupInfoDialog } from './GroupInfoDialog';
import { InviteUsersDialog } from './InviteUsersDialog';
import { TypingIndicator } from './TypingIndicator';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceMessage } from './VoiceMessage';
import { FileAttachment } from './FileAttachment';
import { FilePreview } from './FilePreview';
import { CameraCapture } from './CameraCapture';
import { PDFViewer } from '@/components/messages/PDFViewer';
import { ImageThumbnail } from '@/components/messages/ImageThumbnail';
import { PhotoCollage } from '@/components/messages/PhotoCollage';
import { MessageReply } from '@/components/messages/MessageReply';
import { LinkPreview } from '@/components/messages/LinkPreview';
import { ReactionPicker } from '@/components/messages/ReactionPicker';
import { PinnedMessages } from '@/components/chat/PinnedMessages';
import { MentionInput } from '@/components/chat/MentionInput';
import { ForwardMessageDialog } from '@/components/chat/ForwardMessageDialog';
import { DragDropUpload } from '@/components/chat/DragDropUpload';
import { ReadReceipts } from '@/components/chat/ReadReceipts';
import { OnlineStatus } from '@/components/chat/OnlineStatus';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface GroupChatProps {
  group: Group;
  onUpdateGroup: (groupId: string, name: string, description?: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
}

export const GroupChat = ({ group, onUpdateGroup, onDeleteGroup, onLeaveGroup }: GroupChatProps) => {
  const { messages, loading, sendMessage, sendVoiceMessage, sendFileMessage, editMessage, deleteMessage } = useMessages(group.id);
  const { members } = useGroupMembers(group.id);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
    getCurrentUser();
  }, [group.id]);

  useEffect(() => {
    fetchProfiles();
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Notify for new messages from others
  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      const lastMessage = messages[messages.length - 1];
      
      if (
        lastMessage.user_id !== currentUserId && 
        lastMessage.id !== lastMessageIdRef.current &&
        profiles[lastMessage.user_id]
      ) {
        const senderName = profiles[lastMessage.user_id]?.display_name || 
                          profiles[lastMessage.user_id]?.username || 
                          'Someone';
        
        toast.info(`💬 ${senderName} in ${group.name}`, {
          description: lastMessage.voice_url ? '🎤 Voice message' :
                      lastMessage.file_url ? `📎 ${lastMessage.file_name}` :
                      lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "")
        });
        
        lastMessageIdRef.current = lastMessage.id;
      }
    }
  }, [messages, currentUserId, profiles, group.name]);

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
      .select('id, username, display_name, avatar_url, last_seen')
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

    await sendMessage(newMessage, replyTo?.id);
    setNewMessage('');
    setReplyTo(null);
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

  const handleFileSend = async (file: File) => {
    await sendFileMessage(file);
  };

  const handleDragDropFiles = async (files: File[]) => {
    for (const file of files) {
      await sendFileMessage(file);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const handleForward = (message: Message) => {
    setForwardMessage(message);
    setShowForwardDialog(true);
  };

  const handlePin = async (messageId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase.from('pinned_messages').insert({
      message_id: messageId,
      group_id: group.id,
      pinned_by: user.id
    });

    if (error) {
      toast.error('Failed to pin message');
    } else {
      toast.success('Message pinned');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    toast.success(`Reacted with ${emoji}`);
  };

  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/20');
      setTimeout(() => element.classList.remove('bg-primary/20'), 2000);
    }
  };

  // Group consecutive images for collage
  const getCollageGroups = () => {
    const groups: Message[][] = [];
    let currentGroup: Message[] = [];

    messages.forEach((msg, idx) => {
      if (msg.file_type?.startsWith('image/') && msg.file_url) {
        currentGroup.push(msg);
        if (currentGroup.length === 4 || idx === messages.length - 1) {
          if (currentGroup.length === 4) {
            groups.push([...currentGroup]);
          }
          currentGroup = [];
        }
      } else {
        currentGroup = [];
      }
    });

    return groups;
  };

  const isPartOfCollage = (messageId: string) => {
    const collageGroups = getCollageGroups();
    return collageGroups.some(group => group.some(msg => msg.id === messageId));
  };

  const isUserOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const memberUserIds = members.map(m => m.user_id);

  return (
    <DragDropUpload onFilesSelected={handleDragDropFiles} className="h-full">
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
              <DropdownMenuItem onClick={() => setShowInfo(true)}>
                <Info className="mr-2 h-4 w-4" />
                Group Info
              </DropdownMenuItem>
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

        {/* Pinned Messages */}
        <PinnedMessages groupId={group.id} onJumpToMessage={handleJumpToMessage} />

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, idx) => {
              const profile = profiles[message.user_id];
              const isOwnMessage = message.user_id === currentUserId;
              const isEditing = editingMessageId === message.id;
              const collageGroups = getCollageGroups();
              const collageGroup = collageGroups.find(group => group[0].id === message.id);
              const replyToMessage = message.reply_to_message_id 
                ? messages.find(m => m.id === message.reply_to_message_id)
                : null;
              
              // Skip if part of collage but not the first message
              if (isPartOfCollage(message.id) && !collageGroup) {
                return null;
              }

              return (
                <div key={message.id} id={`message-${message.id}`} className="animate-fade-in transition-colors duration-500">
                  <div className="flex items-start gap-3 group">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback>
                          {profile?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <OnlineStatus 
                          isOnline={isUserOnline(profile?.last_seen)} 
                          size="sm"
                          showText={false}
                        />
                      </div>
                    </div>
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
                          <ReadReceipts isSent={true} isDelivered={true} isRead={false} />
                        )}
                        {!message.is_deleted && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all hover-scale"
                              onClick={() => handleReply(message)}
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all hover-scale"
                              onClick={() => handleForward(message)}
                            >
                              <Forward className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all hover-scale"
                              onClick={() => handlePin(message.id)}
                            >
                              <Pin className="h-3 w-3" />
                            </Button>
                            <ReactionPicker onReact={(emoji) => handleReaction(message.id, emoji)} />
                          </>
                        )}
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
                      
                      {/* Reply context */}
                      {replyToMessage && (
                        <div 
                          className="mb-2 pl-3 border-l-2 border-primary/50 text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 rounded py-1"
                          onClick={() => handleJumpToMessage(replyToMessage.id)}
                        >
                          <span className="font-medium text-primary">
                            {profiles[replyToMessage.user_id]?.display_name || 'User'}
                          </span>
                          <p className="truncate">{replyToMessage.content}</p>
                        </div>
                      )}
                      
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
                           {collageGroup ? (
                             <PhotoCollage
                               images={collageGroup.map(msg => ({
                                 url: msg.file_url!,
                                 alt: msg.file_name || 'Image'
                               }))}
                             />
                           ) : message.voice_url && message.voice_duration ? (
                             <VoiceMessage
                               voiceUrl={message.voice_url}
                               duration={message.voice_duration}
                             />
                           ) : message.file_url && message.file_name ? (
                             message.file_type?.includes('pdf') ? (
                               <PDFViewer fileUrl={message.file_url} fileName={message.file_name} />
                             ) : message.file_type?.startsWith('image/') ? (
                               <ImageThumbnail imageUrl={message.file_url} alt={message.file_name} />
                             ) : (
                               <FilePreview
                                 fileUrl={message.file_url}
                                 fileName={message.file_name}
                                 fileSize={message.file_size || 0}
                                 fileType={message.file_type || 'application/octet-stream'}
                               />
                             )
                           ) : (
                             <div className={`rounded-lg px-3 py-2 inline-block ${
                               message.is_deleted ? 'bg-muted/50' : 'bg-muted'
                             }`}>
                               <p className={`text-sm whitespace-pre-wrap break-words ${
                                 message.is_deleted ? 'italic text-muted-foreground' : ''
                               }`}>
                                 {message.content}
                               </p>
                               {message.link_url && (
                                 <LinkPreview
                                   url={message.link_url}
                                   title={message.link_title}
                                   description={message.link_description}
                                   image={message.link_image}
                                 />
                               )}
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
          <MessageReply replyTo={replyTo} onClear={() => setReplyTo(null)} />
          <div className="flex gap-2">
            <CameraCapture onCapture={handleFileSend} />
            <FileAttachment
              onFileSelect={() => {}}
              onSend={handleFileSend}
            />
            <VoiceRecorder onSendVoice={handleVoiceSend} />
            <MentionInput
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type a message... Use @ to mention"
              groupMembers={memberUserIds}
            />
            <Button onClick={handleSend} size="icon" className="hover-scale">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <GroupInfoDialog
          open={showInfo}
          onOpenChange={setShowInfo}
          group={group}
          isAdmin={isAdmin}
          onUpdateGroup={onUpdateGroup}
        />

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

        <ForwardMessageDialog
          open={showForwardDialog}
          onOpenChange={setShowForwardDialog}
          message={forwardMessage}
          currentUserId={currentUserId || ''}
        />
      </div>
    </DragDropUpload>
  );
};
