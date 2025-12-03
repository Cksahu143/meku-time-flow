import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ReadReceiptsProps {
  isSent: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  readBy?: string[];
  showNames?: boolean;
}

export const ReadReceipts: React.FC<ReadReceiptsProps> = ({
  isSent,
  isDelivered = true,
  isRead = false,
  readBy = [],
  showNames = false
}) => {
  if (!isSent) return null;

  const getIcon = () => {
    if (isRead) {
      return <CheckCheck className="h-3.5 w-3.5 text-blue-500 animate-scale-in" />;
    }
    if (isDelivered) {
      return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getTooltipContent = () => {
    if (isRead && readBy.length > 0 && showNames) {
      return `Read by ${readBy.join(', ')}`;
    }
    if (isRead) return 'Read';
    if (isDelivered) return 'Delivered';
    return 'Sent';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex ml-1 cursor-default">
          {getIcon()}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {getTooltipContent()}
      </TooltipContent>
    </Tooltip>
  );
};
