import React from 'react';
import { Reply, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message, DirectMessage } from '@/types';

interface MessageReplyProps {
  replyTo: Message | DirectMessage | null;
  onClear: () => void;
}

export const MessageReply: React.FC<MessageReplyProps> = ({ replyTo, onClear }) => {
  if (!replyTo) return null;

  const getSenderName = () => {
    // For group messages, we'd need to fetch the profile
    // For now, just show a generic label
    return 'Message';
  };

  const getContent = () => {
    if (replyTo.voice_url) return '🎤 Voice message';
    if (replyTo.file_url) return `📎 ${replyTo.file_name || 'File'}`;
    return replyTo.content.slice(0, 50) + (replyTo.content.length > 50 ? '...' : '');
  };

  return (
    <div className="bg-muted/50 border-l-4 border-primary px-3 py-2 rounded-r-lg flex items-center gap-2 mb-2 animate-slide-in-left">
      <Reply className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary mb-0.5">Replying to {getSenderName()}</p>
        <p className="text-sm text-muted-foreground truncate">{getContent()}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0 hover-scale"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};