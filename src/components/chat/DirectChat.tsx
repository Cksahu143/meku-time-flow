import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { DirectMessage, Message } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MoreVertical, Edit2, Trash2, Mic, Reply, Forward, ArrowLeft, Smile, Phone, Video } from 'lucide-react';
import { useCall } from '@/components/call/CallProvider';
import { VoiceRecorder } from '@/components/groups/VoiceRecorder';
import { FileAttachment } from '@/components/groups/FileAttachment';
import { CameraCapture } from '@/components/groups/CameraCapture';
import { FilePreview } from '@/components/groups/FilePreview';
import { PDFViewer } from '@/components/messages/PDFViewer';
import { ImageThumbnail } from '@/components/messages/ImageThumbnail';
import { PhotoCollage } from '@/components/messages/PhotoCollage';
import { MessageReply } from '@/components/messages/MessageReply';
import { LinkPreview } from '@/components/messages/LinkPreview';
import { ReactionPicker } from '@/components/messages/ReactionPicker';
import { MentionInput } from '@/components/chat/MentionInput';
import { ForwardMessageDialog } from '@/components/chat/ForwardMessageDialog';
import { DragDropUpload } from '@/components/chat/DragDropUpload';
import { ReadReceipts } from '@/components/chat/ReadReceipts';
import { OnlineStatus } from '@/components/chat/OnlineStatus';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DirectChatProps {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  onBack: () => void;
}

export const DirectChat = ({ conversationId, otherUserId, otherUserName, otherUserAvatar, onBack }: DirectChatProps) => {
  const [input, setInput] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const { messages, loading, sendMessage, sendVoiceMessage, sendFileMessage, editMessage, deleteMessage } = useDirectMessages(conversationId);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
    fetchOtherUserStatus();
  }, [otherUserId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_id !== currentUserId && lastMessage.id !== lastMessageIdRef.current) {
        toast.info(`💬 ${otherUserName}`, {
          description: lastMessage.voice_url ? '🎤 Voice message' :
            lastMessage.file_url ? `📎 ${lastMessage.file_name}` :
            lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '…' : '')
        });
        lastMessageIdRef.current = lastMessage.id;
      }
    }
  }, [messages, currentUserId, otherUserName]);

  const fetchOtherUserStatus = async () => {
    const { data } = await supabase.from('profiles').select('last_seen').eq('id', otherUserId).maybeSingle();
    if (data) setOtherUserLastSeen(data.last_seen);
  };

  const isUserOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, replyTo?.id);
    setInput('');
    setReplyTo(null);
  };

  const startEdit = (messageId: string, content: string) => { setEditingMessageId(messageId); setEditingContent(content); };
  const saveEdit = () => {
    if (editingMessageId && editingContent.trim()) {
      editMessage(editingMessageId, editingContent);
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const handleForward = (message: DirectMessage) => {
    const messageForForward: Message = {
      id: message.id, group_id: '', user_id: message.sender_id, content: message.content,
      created_at: message.created_at, edited_at: message.edited_at, is_deleted: message.is_deleted,
      voice_url: message.voice_url, voice_duration: message.voice_duration,
      file_url: message.file_url, file_name: message.file_name, file_type: message.file_type, file_size: message.file_size,
      reply_to_message_id: message.reply_to_message_id,
      link_url: message.link_url, link_title: message.link_title, link_description: message.link_description, link_image: message.link_image
    };
    setForwardMessage(messageForForward);
    setShowForwardDialog(true);
  };

  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`dm-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/20');
      setTimeout(() => element.classList.remove('bg-primary/20'), 2000);
    }
  };

  const getCollageGroups = () => {
    const groups: DirectMessage[][] = [];
    let currentGroup: DirectMessage[] = [];
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

  const isPartOfCollage = (messageId: string) => getCollageGroups().some(group => group.some(msg => msg.id === messageId));

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
    const groups: { date: string; messages: DirectMessage[] }[] = [];
    messages.forEach((msg) => {
      const dateLabel = getDateLabel(msg.created_at);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateLabel) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date: dateLabel, messages: [msg] });
      }
    });
    return groups;
  };

  return (
    <DragDropUpload onFilesSelected={async (files) => { for (const f of files) await sendFileMessage(f); }} className="h-full">
      <div className="h-full flex flex-col bg-background">
        {/* WhatsApp-style header */}
        <div className="px-3 py-2.5 bg-muted/30 border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full h-9 w-9 -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUserAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {otherUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5">
              <OnlineStatus isOnline={isUserOnline(otherUserLastSeen)} size="sm" showText={false} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[15px] text-foreground truncate">{otherUserName}</h2>
            <OnlineStatus isOnline={isUserOnline(otherUserLastSeen)} lastSeen={otherUserLastSeen} showBadge={false} showText={true} />
          </div>
        </div>

        {/* Messages area - WhatsApp wallpaper style */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="px-3 py-2 min-h-full flex flex-col justify-end">
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5 text-sm text-muted-foreground">
                  <Smile className="h-4 w-4" />
                  Say hello to {otherUserName}!
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {getMessageGroups().map((group) => (
                  <div key={group.date}>
                    {/* Date separator - WhatsApp style */}
                    <div className="flex justify-center my-3">
                      <span className="bg-muted/80 text-muted-foreground text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm">
                        {group.date}
                      </span>
                    </div>
                    {group.messages.map((message) => {
                      const isOwn = message.sender_id === currentUserId;
                      const isEditing = editingMessageId === message.id;
                      const collageGroups = getCollageGroups();
                      const collageGroup = collageGroups.find(g => g[0].id === message.id);
                      const replyToMessage = message.reply_to_message_id ? messages.find(m => m.id === message.reply_to_message_id) : null;

                      if (isPartOfCollage(message.id) && !collageGroup) return null;

                      return (
                        <div
                          key={message.id}
                          id={`dm-${message.id}`}
                          className={`flex mb-1 group transition-colors duration-500 ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`relative max-w-[75%] ${isOwn ? 'order-1' : 'order-1'}`}>
                            {/* WhatsApp bubble tail */}
                            <div className={`rounded-2xl px-3 py-1.5 shadow-sm ${
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-card border border-border/50 rounded-tl-sm'
                            }`}>
                              {/* Reply context */}
                              {replyToMessage && (
                                <div
                                  className={`mb-1.5 pl-2.5 border-l-2 rounded py-1 cursor-pointer text-xs ${
                                    isOwn ? 'border-primary-foreground/40 bg-primary-foreground/10' : 'border-primary/50 bg-muted/50'
                                  }`}
                                  onClick={() => handleJumpToMessage(replyToMessage.id)}
                                >
                                  <span className={`font-semibold ${isOwn ? 'text-primary-foreground/80' : 'text-primary'}`}>
                                    {replyToMessage.sender_id === currentUserId ? 'You' : otherUserName}
                                  </span>
                                  <p className={`truncate ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                    {replyToMessage.content}
                                  </p>
                                </div>
                              )}

                              {isEditing ? (
                                <div className="space-y-2 py-1">
                                  <Input value={editingContent} onChange={(e) => setEditingContent(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && saveEdit()} className="h-8 text-sm" />
                                  <div className="flex gap-1.5">
                                    <Button size="sm" onClick={saveEdit} className="h-7 text-xs">Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)} className="h-7 text-xs">Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Media content */}
                                  {collageGroup ? (
                                    <PhotoCollage images={collageGroup.map(msg => ({ url: msg.file_url!, alt: msg.file_name || 'Image' }))} />
                                  ) : message.file_url && (
                                    message.file_type?.includes('pdf') ? (
                                      <PDFViewer fileUrl={message.file_url} fileName={message.file_name || 'Document'} />
                                    ) : message.file_type?.startsWith('image/') ? (
                                      <ImageThumbnail imageUrl={message.file_url} alt={message.file_name || 'Image'} />
                                    ) : (
                                      <FilePreview fileUrl={message.file_url} fileName={message.file_name || 'File'}
                                        fileType={message.file_type || 'application/octet-stream'} fileSize={message.file_size || 0} />
                                    )
                                  )}
                                  {message.voice_url && (
                                    <audio controls className="max-w-[240px] h-8">
                                      <source src={message.voice_url} type="audio/webm" />
                                    </audio>
                                  )}
                                  {!message.is_deleted && !collageGroup && (
                                    <p className="text-[14.5px] leading-[19px] whitespace-pre-wrap break-words">{message.content}</p>
                                  )}
                                  {message.link_url && (
                                    <LinkPreview url={message.link_url} title={message.link_title} description={message.link_description} image={message.link_image} />
                                  )}
                                  {message.is_deleted && (
                                    <p className="italic opacity-60 text-sm">{message.content}</p>
                                  )}

                                  {/* Timestamp + read receipts - WhatsApp style inline */}
                                  <div className={`flex items-center justify-end gap-1 -mb-0.5 mt-0.5 ${isOwn ? '' : ''}`}>
                                    <span className={`text-[10.5px] leading-none ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {message.edited_at && ' · edited'}
                                    </span>
                                    {isOwn && !message.is_deleted && (
                                      <ReadReceipts isSent={true} isDelivered={true} isRead={false} />
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Hover actions */}
                            {!message.is_deleted && !isEditing && (
                              <div className={`absolute top-0 ${isOwn ? '-left-20' : '-right-20'} opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 bg-card border border-border/50 rounded-lg shadow-md px-0.5 py-0.5`}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyTo(message)}>
                                  <Reply className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleForward(message)}>
                                  <Forward className="h-3.5 w-3.5" />
                                </Button>
                                <ReactionPicker onReact={(emoji) => toast.success(`Reacted with ${emoji}`)} />
                                {isOwn && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {!message.voice_url && !message.file_url && (
                                        <DropdownMenuItem onClick={() => startEdit(message.id, message.content)}>
                                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => deleteMessage(message.id, message.voice_url)} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                      </DropdownMenuItem>
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
          </div>
        </ScrollArea>

        {/* WhatsApp-style input bar */}
        <div className="px-2 py-2 bg-muted/20 border-t border-border">
          <MessageReply replyTo={replyTo} onClear={() => setReplyTo(null)} />
          {isRecording ? (
            <VoiceRecorder onSendVoice={(blob, duration) => { sendVoiceMessage(blob, duration); setIsRecording(false); }} onRecordingChange={(recording) => { if (!recording) setIsRecording(false); }} />
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <FileAttachment onFileSelect={() => {}} onSend={async (file) => sendFileMessage(file)} />
                <CameraCapture onCapture={sendFileMessage} />
              </div>
              <div className="flex-1 flex items-center gap-1.5 bg-card border border-border/50 rounded-full px-1 pr-1.5">
                <MentionInput
                  value={input}
                  onChange={setInput}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Message"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-10 text-sm"
                />
              </div>
              {input.trim() ? (
                <Button onClick={handleSend} size="icon" className="rounded-full h-10 w-10 bg-primary hover:bg-primary/90 flex-shrink-0">
                  <Send className="h-4.5 w-4.5" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setIsRecording(true)} className="rounded-full h-10 w-10 flex-shrink-0">
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}
        </div>

        <ForwardMessageDialog open={showForwardDialog} onOpenChange={setShowForwardDialog} message={forwardMessage} currentUserId={currentUserId} />
      </div>
    </DragDropUpload>
  );
};
