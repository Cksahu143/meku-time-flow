import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { OnlineStatus } from '@/components/chat/OnlineStatus';
import { CallType } from '@/hooks/useWebRTC';

interface MemberProfile {
  id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  last_seen?: string;
}

interface GroupCallPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callType: CallType;
  members: MemberProfile[];
  currentUserId: string | null;
  onSelectMember: (userId: string, name: string, callType: CallType) => void;
}

export const GroupCallPickerDialog: React.FC<GroupCallPickerDialogProps> = ({
  open, onOpenChange, callType, members, currentUserId, onSelectMember,
}) => {
  const otherMembers = members.filter(m => m.id !== currentUserId);

  const isOnline = (lastSeen: string | undefined) => {
    if (!lastSeen) return false;
    return new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {callType === 'video' ? <Video className="h-5 w-5 text-primary" /> : <Phone className="h-5 w-5 text-primary" />}
            Choose who to call
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {otherMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No other members in this group</p>
          ) : (
            otherMembers.map((member) => {
              const name = member.display_name || member.username || 'Unknown';
              const initials = name.charAt(0).toUpperCase();
              const online = isOnline(member.last_seen);

              return (
                <button
                  key={member.id}
                  onClick={() => {
                    onSelectMember(member.id, name, callType);
                    onOpenChange(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials}</AvatarFallback>
                    </Avatar>
                    {online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">{online ? 'Online' : 'Offline'}</p>
                  </div>
                  <div className="shrink-0">
                    {callType === 'video' ? (
                      <Video className="h-4 w-4 text-primary" />
                    ) : (
                      <Phone className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};