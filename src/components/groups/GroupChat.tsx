import React, { useState, useRef, useEffect } from 'react';
import { Group, Message } from '@/types';
import { useMessages } from '@/hooks/useMessages';
import { useGroupMembers } from '@/hooks/useGroupMembers';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MoreVertical, Users, LogOut, Edit, Trash, X, Info, Reply, Pin, Forward, ArrowLeft, Mic, Smile, Phone, Video } from 'lucide-react';
import { useCall } from '@/components/call/CallProvider';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface GroupChatProps {
  group: Group;
  onUpdateGroup: (groupId: string, name: string, description?: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onLeaveGroup: (groupId: string) => void;
  onBack?: () => void;
}

export const GroupChat = ({ group, onUpdateGroup, onDeleteGroup, onLeaveGroup, onBack }: GroupChatProps) => {
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

  useEffect(() => { checkAdminStatus(); getCurrentUser(); }, [group.id]);
  useEffect(() => { fetchProfiles(); }, [messages]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.user_id !== currentUserId && lastMessage.id !== lastMessageIdRef.current && profiles[lastMessage.user_id]) {
        const senderName = profiles[lastMessage.user_id]?.display_name || profiles[lastMessage.user_id]?.username || 'Someone';
        toast.info(`💬 ${senderName} in ${group.name}`, {
          description: lastMessage.voice_url ? '🎤 Voice message' :
            lastMessage.file_url ? `📎 ${lastMessage.file_name}` :
            lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '…' : '')
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
    const { data } = await supabase.from('group_members').select('role').eq('group_id', group.id).eq('user_id', user.id).maybeSingle();
    setIsAdmin(data?.role === 'admin');
  };

  const fetchProfiles = async () => {
    const userIds = [...new Set(messages.map(m => m.user_id))];
    if (userIds.length === 0) return;
    const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url, last_seen').in('id', userIds);
    if (data) {
      const profileMap = data.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<string, any>);
      setProfiles(profileMap);
    }
  };

  const scrollToBottom = () => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage(newMessage, replyTo?.id);
    setNewMessage('');
    setReplyTo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = async (value: string) => {
    setNewMessage(value);
    if (!isTyping && value.trim()) { setIsTyping(true); await updateTypingStatus(true); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => { setIsTyping(false); await updateTypingStatus(false); }, 2000);
  };

  const updateTypingStatus = async (typing: boolean) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from('typing_indicators').upsert({ group_id: group.id, user_id: user.id, is_typing: typing });
  };

  const startEdit = (messageId: string, content: string) => { setEditingMessageId(messageId); setEditingContent(content); };
  const cancelEdit = () => { setEditingMessageId(null); setEditingContent(''); };
  const saveEdit = async (messageId: string) => { await editMessage(messageId, editingContent); cancelEdit(); };

  const handlePin = async (messageId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { error } = await supabase.from('pinned_messages').insert({ message_id: messageId, group_id: group.id, pinned_by: user.id });
    if (error) toast.error('Failed to pin message');
    else toast.success('Message pinned');
  };

  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/20');
      setTimeout(() => element.classList.remove('bg-primary/20'), 2000);
    }
  };

  const getCollageGroups = () => {
    const groups: Message[][] = [];
    let currentGroup: Message[] = [];
    messages.forEach((msg, idx) => {
      if (msg.file_type?.startsWith('image/') && msg.file_url) {
        currentGroup.push(msg);
        if (currentGroup.length === 4 || idx === messages.length - 1) {
          if (currentGroup.length === 4) groups.push([...currentGroup]);
          currentGroup = [];
        }
      } else { currentGroup = []; }
    });
    return groups;
  };

  const isPartOfCollage = (messageId: string) => getCollageGroups().some(g => g.some(msg => msg.id === messageId));

  const isUserOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000);
  };

  // Group messages by date
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const getMessageGroups = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    messages.forEach((msg) => {
      const dateLabel = getDateLabel(msg.created_at);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateLabel) lastGroup.messages.push(msg);
      else groups.push({ date: dateLabel, messages: [msg] });
    });
    return groups;
  };

  const memberUserIds = members.map(m => m.user_id);

  return (
    <DragDropUpload onFilesSelected={async (files) => { for (const f of files) await sendFileMessage(f); }} className="h-full">
      <div className="h-full flex flex-col bg-background">
        {/* WhatsApp-style header */}
        <div className="px-3 py-2.5 bg-muted/30 border-b border-border flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full h-9 w-9 -ml-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10">
            <AvatarImage src={group.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{group.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0" onClick={() => setShowInfo(true)} role="button">
            <h2 className="font-semibold text-[15px] text-foreground truncate">{group.name}</h2>
            <p className="text-[11px] text-muted-foreground truncate">{members.length} members</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowInfo(true)}><Info className="mr-2 h-4 w-4" />Group Info</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowInvite(true)}><Users className="mr-2 h-4 w-4" />Invite Members</DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => setShowSettings(true)}><Edit className="mr-2 h-4 w-4" />Edit Group</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteGroup(group.id)} className="text-destructive"><Trash className="mr-2 h-4 w-4" />Delete Group</DropdownMenuItem>
                </>
              )}
              {!isAdmin && (
                <DropdownMenuItem onClick={() => onLeaveGroup(group.id)} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Leave Group</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <PinnedMessages groupId={group.id} onJumpToMessage={handleJumpToMessage} />

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="px-3 py-2 min-h-full flex flex-col justify-end">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
                  <Smile className="h-4 w-4" /> Start the conversation!
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {getMessageGroups().map((dateGroup) => (
                  <div key={dateGroup.date}>
                    <div className="flex justify-center my-3">
                      <span className="bg-muted/80 text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">
                        {dateGroup.date}
                      </span>
                    </div>
                    {dateGroup.messages.map((message) => {
                      const profile = profiles[message.user_id];
                      const isOwnMessage = message.user_id === currentUserId;
                      const isEditing = editingMessageId === message.id;
                      const collageGroups = getCollageGroups();
                      const collageGroup = collageGroups.find(g => g[0].id === message.id);
                      const replyToMessage = message.reply_to_message_id ? messages.find(m => m.id === message.reply_to_message_id) : null;

                      if (isPartOfCollage(message.id) && !collageGroup) return null;

                      // Show sender name for non-own messages (group chat)
                      const showSender = !isOwnMessage;

                      return (
                        <div
                          key={message.id}
                          id={`message-${message.id}`}
                          className={`flex mb-1 group transition-colors duration-500 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Avatar for others */}
                          {!isOwnMessage && (
                            <Avatar className="h-7 w-7 mt-1 mr-1.5 flex-shrink-0">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {(profile?.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="relative max-w-[75%]">
                            <div className={`rounded-2xl px-3 py-1.5 shadow-sm ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-card border border-border/50 rounded-tl-sm'
                            }`}>
                              {/* Sender name in group */}
                              {showSender && (
                                <p className="text-[12px] font-semibold text-primary mb-0.5">
                                  {profile?.display_name || profile?.username || 'User'}
                                </p>
                              )}

                              {/* Reply context */}
                              {replyToMessage && (
                                <div
                                  className={`mb-1.5 pl-2.5 border-l-2 rounded py-1 cursor-pointer text-xs ${
                                    isOwnMessage ? 'border-primary-foreground/40 bg-primary-foreground/10' : 'border-primary/50 bg-muted/50'
                                  }`}
                                  onClick={() => handleJumpToMessage(replyToMessage.id)}
                                >
                                  <span className={`font-semibold ${isOwnMessage ? 'text-primary-foreground/80' : 'text-primary'}`}>
                                    {profiles[replyToMessage.user_id]?.display_name || 'User'}
                                  </span>
                                  <p className={`truncate ${isOwnMessage ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                    {replyToMessage.content}
                                  </p>
                                </div>
                              )}

                              {isEditing ? (
                                <div className="flex gap-2 items-center py-1">
                                  <Input value={editingContent} onChange={(e) => setEditingContent(e.target.value)}
                                    onKeyPress={(e) => { if (e.key === 'Enter') saveEdit(message.id); else if (e.key === 'Escape') cancelEdit(); }}
                                    className="flex-1 h-8 text-sm" />
                                  <Button size="sm" onClick={() => saveEdit(message.id)} className="h-7">Save</Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7"><X className="h-3.5 w-3.5" /></Button>
                                </div>
                              ) : (
                                <div>
                                  {collageGroup ? (
                                    <PhotoCollage images={collageGroup.map(msg => ({ url: msg.file_url!, alt: msg.file_name || 'Image' }))} />
                                  ) : message.voice_url && message.voice_duration ? (
                                    <VoiceMessage voiceUrl={message.voice_url} duration={message.voice_duration} />
                                  ) : message.file_url && message.file_name ? (
                                    message.file_type?.includes('pdf') ? (
                                      <PDFViewer fileUrl={message.file_url} fileName={message.file_name} />
                                    ) : message.file_type?.startsWith('image/') ? (
                                      <ImageThumbnail imageUrl={message.file_url} alt={message.file_name} />
                                    ) : (
                                      <FilePreview fileUrl={message.file_url} fileName={message.file_name} fileSize={message.file_size || 0} fileType={message.file_type || 'application/octet-stream'} />
                                    )
                                  ) : (
                                    <>
                                      <p className={`text-[14.5px] leading-[19px] whitespace-pre-wrap break-words ${message.is_deleted ? 'italic opacity-60' : ''}`}>
                                        {message.content}
                                      </p>
                                      {message.link_url && (
                                        <LinkPreview url={message.link_url} title={message.link_title} description={message.link_description} image={message.link_image} />
                                      )}
                                    </>
                                  )}

                                  {/* Timestamp */}
                                  <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
                                    <span className={`text-[10.5px] leading-none ${isOwnMessage ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {message.edited_at && ' · edited'}
                                    </span>
                                    {isOwnMessage && !message.is_deleted && (
                                      <ReadReceipts isSent={true} isDelivered={true} isRead={false} />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Hover actions */}
                            {!message.is_deleted && !isEditing && (
                              <div className={`absolute top-0 ${isOwnMessage ? '-left-24' : '-right-24'} opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 bg-card border border-border/50 rounded-lg shadow-md px-0.5 py-0.5`}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyTo(message)}><Reply className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForwardMessage(message); setShowForwardDialog(true); }}><Forward className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePin(message.id)}><Pin className="h-3.5 w-3.5" /></Button>
                                <ReactionPicker onReact={(emoji) => toast.success(`Reacted with ${emoji}`)} />
                                {isOwnMessage && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {!message.voice_url && (
                                        <DropdownMenuItem onClick={() => startEdit(message.id, message.content)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => deleteMessage(message.id, message.voice_url)} className="text-destructive"><Trash className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            <TypingIndicator groupId={group.id} />
          </div>
        </ScrollArea>

        {/* WhatsApp-style input */}
        <div className="px-2 py-2 bg-muted/20 border-t border-border">
          <MessageReply replyTo={replyTo} onClear={() => setReplyTo(null)} />
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <CameraCapture onCapture={async (f) => await sendFileMessage(f)} />
              <FileAttachment onFileSelect={() => {}} onSend={async (f) => await sendFileMessage(f)} />
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-card border border-border/50 rounded-full px-1 pr-1.5">
              <MentionInput
                value={newMessage}
                onChange={handleTyping}
                onKeyPress={handleKeyPress}
                placeholder="Message"
                groupMembers={memberUserIds}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm"
              />
            </div>
            {newMessage.trim() ? (
              <Button onClick={handleSend} size="icon" className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 flex-shrink-0">
                <Send className="h-4.5 w-4.5" />
              </Button>
            ) : (
              <VoiceRecorder onSendVoice={async (blob, dur) => await sendVoiceMessage(blob, dur)} />
            )}
          </div>
        </div>

        <GroupInfoDialog open={showInfo} onOpenChange={setShowInfo} group={group} isAdmin={isAdmin} onUpdateGroup={onUpdateGroup} />
        <GroupSettingsDialog open={showSettings} onOpenChange={setShowSettings} group={group} onUpdate={onUpdateGroup} />
        <InviteUsersDialog open={showInvite} onOpenChange={setShowInvite} groupId={group.id} />
        <ForwardMessageDialog open={showForwardDialog} onOpenChange={setShowForwardDialog} message={forwardMessage} currentUserId={currentUserId || ''} />
      </div>
    </DragDropUpload>
  );
};
