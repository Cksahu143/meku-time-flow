import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: string | null;
  showBadge?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isOnline,
  lastSeen,
  showBadge = true,
  showText = false,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  const getLastSeenText = () => {
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline';
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / 60000);
    
    if (diffMinutes < 5) return 'Active recently';
    return `Last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`;
  };

  return (
    <div className="flex items-center gap-1.5">
      {showBadge && (
        <span 
          className={cn(
            'rounded-full transition-colors',
            sizeClasses[size],
            isOnline 
              ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
              : 'bg-muted-foreground/50'
          )}
        />
      )}
      {showText && (
        <span className={cn(
          'text-xs',
          isOnline ? 'text-green-500' : 'text-muted-foreground'
        )}>
          {getLastSeenText()}
        </span>
      )}
    </div>
  );
};
