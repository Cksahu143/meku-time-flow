import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MoreVertical, Edit2, Trash2, Mic } from 'lucide-react';
import { VoiceRecorder } from './groups/VoiceRecorder';
import { FileAttachment } from './groups/FileAttachment';
import { CameraCapture } from './groups/CameraCapture';
import { FilePreview } from './groups/FilePreview';
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
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
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify for new messages from the other user
  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      const lastMessage = messages[messages.length - 1];
      
      // Only notify if it's from the other user, it's new, and not already notified
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

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
            <Avatar>
              <AvatarImage src={otherUserAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {otherUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <CardTitle>{otherUserName}</CardTitle>
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

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
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
                            {message.file_url && (
                              <FilePreview
                                fileUrl={message.file_url}
                                fileName={message.file_name}
                                fileType={message.file_type}
                                fileSize={message.file_size}
                              />
                            )}
                            {message.voice_url && (
                              <audio controls className="max-w-full">
                                <source src={message.voice_url} type="audio/webm" />
                              </audio>
                            )}
                            {!message.is_deleted && (
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
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
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button onClick={handleSend} size="icon">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
