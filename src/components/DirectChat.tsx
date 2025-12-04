import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { DirectMessage, Message } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MoreVertical, Edit2, Trash2, Mic, Reply, Forward } from 'lucide-react';
import { VoiceRecorder } from './groups/VoiceRecorder';
import { FileAttachment } from './groups/FileAttachment';
import { CameraCapture } from './groups/CameraCapture';
import { FilePreview } from './groups/FilePreview';
import { PDFViewer } from './messages/PDFViewer';
import { ImageThumbnail } from './messages/ImageThumbnail';
import { PhotoCollage } from './messages/PhotoCollage';
import { MessageReply } from './messages/MessageReply';
import { LinkPreview } from './messages/LinkPreview';
import { ReactionPicker } from './messages/ReactionPicker';
import { MentionInput } from './chat/MentionInput';
import { ForwardMessageDialog } from './chat/ForwardMessageDialog';
import { DragDropUpload } from './chat/DragDropUpload';
import { ReadReceipts } from './chat/ReadReceipts';
import { OnlineStatus } from './chat/OnlineStatus';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DirectChatProps {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  onBack: () => void;
}

export const DirectChat = ({
  conversationId,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  onBack,
}: DirectChatProps) => {
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

  const {
    messages,
    loading,
    sendMessage,
    sendVoiceMessage,
    sendFileMessage,
    editMessage,
    deleteMessage,
  } = useDirectMessages(conversationId);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getCurrentUser();
    fetchOtherUserStatus();
  }, [otherUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify for new messages from the other user
  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      const lastMessage = messages[messages.length - 1];
      
      if (
        lastMessage.sender_id !== currentUserId && 
        lastMessage.id !== lastMessageIdRef.current
      ) {
        toast.info(`💬 ${otherUserName}`, {
          description: lastMessage.voice_url ? '🎤 Voice message' :
                      lastMessage.file_url ? `📎 ${lastMessage.file_name}` :
                      lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "")
        });
        
        lastMessageIdRef.current = lastMessage.id;
      }
    }
  }, [messages, currentUserId, otherUserName]);

  const fetchOtherUserStatus = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('last_seen')
      .eq('id', otherUserId)
      .single();
    
    if (data) setOtherUserLastSeen(data.last_seen);
  };

  const isUserOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, replyTo?.id);
    setInput('');
    setReplyTo(null);
  };

  const startEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const saveEdit = () => {
    if (editingMessageId && editingContent.trim()) {
      editMessage(editingMessageId, editingContent);
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const handleDelete = (messageId: string, voiceUrl?: string) => {
    deleteMessage(messageId, voiceUrl);
  };

  const handleVoiceSend = (blob: Blob, duration: number) => {
    sendVoiceMessage(blob, duration);
  };

  const handleReply = (message: DirectMessage) => {
    setReplyTo(message);
  };

  const handleForward = (message: DirectMessage) => {
    // Convert DirectMessage to Message format for forwarding
    const messageForForward: Message = {
      id: message.id,
      group_id: '',
      user_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      edited_at: message.edited_at,
      is_deleted: message.is_deleted,
      voice_url: message.voice_url,
      voice_duration: message.voice_duration,
      file_url: message.file_url,
      file_name: message.file_name,
      file_type: message.file_type,
      file_size: message.file_size,
      reply_to_message_id: message.reply_to_message_id,
      link_url: message.link_url,
      link_title: message.link_title,
      link_description: message.link_description,
      link_image: message.link_image
    };
    setForwardMessage(messageForForward);
    setShowForwardDialog(true);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    toast.success(`Reacted with ${emoji}`);
  };

  const handleDragDropFiles = async (files: File[]) => {
    for (const file of files) {
      await sendFileMessage(file);
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`dm-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/20');
      setTimeout(() => element.classList.remove('bg-primary/20'), 2000);
    }
  };

  // Group consecutive images for collage
  const getCollageGroups = () => {
    const groups: DirectMessage[][] = [];
    let currentGroup: DirectMessage[] = [];

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

  return (
    <DragDropUpload onFilesSelected={handleDragDropFiles} className="h-full">
      <Card className="h-full flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                ← Back
              </Button>
              <div className="relative">
                <Avatar>
                  <AvatarImage src={otherUserAvatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {otherUserName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatus 
                    isOnline={isUserOnline(otherUserLastSeen)} 
                    size="sm"
                    showText={false}
                  />
                </div>
              </div>
              <div>
                <CardTitle>{otherUserName}</CardTitle>
                <OnlineStatus 
                  isOnline={isUserOnline(otherUserLastSeen)} 
                  lastSeen={otherUserLastSeen}
                  showBadge={false}
                  showText={true}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {loading ? (
              <p className="text-center text-muted-foreground">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === currentUserId;
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
                    <div
                      key={message.id}
                      id={`dm-${message.id}`}
                      className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group animate-fade-in transition-colors duration-500`}
                    >
                      {!isOwn && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={otherUserAvatar} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {otherUserName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`flex-1 max-w-[70%] ${isOwn ? 'flex justify-end' : ''}`}>
                        {/* Reply context */}
                        {replyToMessage && (
                          <div 
                            className={`mb-1 pl-3 border-l-2 border-primary/50 text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 rounded py-1 ${isOwn ? 'mr-auto' : ''}`}
                            onClick={() => handleJumpToMessage(replyToMessage.id)}
                          >
                            <span className="font-medium text-primary">
                              {replyToMessage.sender_id === currentUserId ? 'You' : otherUserName}
                            </span>
                            <p className="truncate">{replyToMessage.content}</p>
                          </div>
                        )}
                        
                        <div
                          className={`rounded-lg p-3 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEdit}>
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingMessageId(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {collageGroup ? (
                                <PhotoCollage
                                  images={collageGroup.map(msg => ({
                                    url: msg.file_url!,
                                    alt: msg.file_name || 'Image'
                                  }))}
                                />
                              ) : message.file_url && (
                                message.file_type?.includes('pdf') ? (
                                  <PDFViewer fileUrl={message.file_url} fileName={message.file_name || 'Document'} />
                                ) : message.file_type?.startsWith('image/') ? (
                                  <ImageThumbnail imageUrl={message.file_url} alt={message.file_name || 'Image'} />
                                ) : (
                                  <FilePreview
                                    fileUrl={message.file_url}
                                    fileName={message.file_name || 'File'}
                                    fileType={message.file_type || 'application/octet-stream'}
                                    fileSize={message.file_size || 0}
                                  />
                                )
                              )}
                              {message.voice_url && (
                                <audio controls className="max-w-full">
                                  <source src={message.voice_url} type="audio/webm" />
                                </audio>
                              )}
                              {!message.is_deleted && !collageGroup && (
                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              )}
                              {message.link_url && (
                                <LinkPreview
                                  url={message.link_url}
                                  title={message.link_title}
                                  description={message.link_description}
                                  image={message.link_image}
                                />
                              )}
                              {message.is_deleted && (
                                <p className="italic opacity-70">{message.content}</p>
                              )}
                              <div className="flex items-center justify-between mt-1 gap-2">
                                <p className="text-xs opacity-70">
                                  {new Date(message.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                  {message.edited_at && ' (edited)'}
                                </p>
                                <div className="flex items-center gap-1">
                                  {isOwn && !message.is_deleted && (
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
                                      <ReactionPicker onReact={(emoji) => handleReaction(message.id, emoji)} />
                                    </>
                                  )}
                                  {isOwn && !message.is_deleted && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        {!message.voice_url && !message.file_url && (
                                          <DropdownMenuItem
                                            onClick={() => startEdit(message.id, message.content)}
                                          >
                                            <Edit2 className="mr-2 h-4 w-4" />
                                            Edit
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => handleDelete(message.id, message.voice_url)}
                                          className="text-destructive"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <MessageReply replyTo={replyTo} onClear={() => setReplyTo(null)} />
            {isRecording ? (
              <VoiceRecorder
                onSendVoice={handleVoiceSend}
              />
            ) : (
              <div className="flex gap-2">
                <FileAttachment 
                  onFileSelect={() => {}}
                  onSend={async (file) => sendFileMessage(file)}
                />
                <CameraCapture onCapture={sendFileMessage} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRecording(true)}
                  className="hover-scale"
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <MentionInput
                  value={input}
                  onChange={setInput}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message... Use @ to mention"
                />
                <Button onClick={handleSend} size="icon" className="hover-scale">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>

        <ForwardMessageDialog
          open={showForwardDialog}
          onOpenChange={setShowForwardDialog}
          message={forwardMessage}
          currentUserId={currentUserId}
        />
      </Card>
    </DragDropUpload>
  );
};
