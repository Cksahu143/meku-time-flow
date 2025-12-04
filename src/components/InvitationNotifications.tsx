import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, Users, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useUnifiedInvitations } from '@/hooks/useUnifiedInvitations';
import { useNotifications } from '@/hooks/useNotifications';

export const InvitationNotifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    timetableInvitations,
    groupInvitations,
    totalCount,
    acceptTimetableInvitation,
    declineTimetableInvitation,
    acceptGroupInvitation,
    declineGroupInvitation,
  } = useUnifiedInvitations();
  
  const { unreadCount } = useNotifications();
  const combinedCount = totalCount + unreadCount;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {combinedCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-bounce-subtle"
            >
              {combinedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notifications</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-xs"
              onClick={() => navigate('/notifhub')}
            >
              <ExternalLink className="h-3 w-3" />
              View All
            </Button>
          </div>
          
          {combinedCount === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No pending notifications
            </p>
          ) : (
            <>
              {/* Group Invitations */}
              {groupInvitations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Group Invitations</span>
                  </div>
                  {groupInvitations.map((invitation) => (
                    <div key={invitation.id} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={invitation.group?.avatar_url} />
                          <AvatarFallback>
                            {invitation.group?.name?.[0]?.toUpperCase() || 'G'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{invitation.group?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Invited by {invitation.inviter?.display_name || invitation.inviter?.username || 'Someone'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => acceptGroupInvitation(invitation.id, invitation.group_id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => declineGroupInvitation(invitation.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Separator if both types exist */}
              {groupInvitations.length > 0 && timetableInvitations.length > 0 && (
                <Separator />
              )}

              {/* Timetable Invitations */}
              {timetableInvitations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Timetable Shares</span>
                  </div>
                  {timetableInvitations.map((invitation) => (
                    <div key={invitation.id} className="p-3 border rounded-lg space-y-2">
                      <p className="text-sm">
                        You have been invited to view a timetable
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => acceptTimetableInvitation(invitation.id, invitation.timetable_id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => declineTimetableInvitation(invitation.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
