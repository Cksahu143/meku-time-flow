import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AtSign,
  Reply,
  UserPlus,
  Heart,
  MessageSquare,
  CheckSquare,
  Timer,
  Users,
  Calendar,
  Settings,
  Megaphone,
  Check,
  CheckCheck,
  Trash2,
  ArrowLeft,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications, NotificationType } from '@/hooks/useNotifications';
import { useGroupInvitations } from '@/hooks/useGroupInvitations';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const notificationConfig: Record<NotificationType, { icon: React.ElementType; color: string; label: string }> = {
  mention: { icon: AtSign, color: 'text-blue-500', label: 'Mentions' },
  reply: { icon: Reply, color: 'text-green-500', label: 'Replies' },
  follow: { icon: UserPlus, color: 'text-purple-500', label: 'Follows' },
  reaction: { icon: Heart, color: 'text-red-500', label: 'Reactions' },
  message: { icon: MessageSquare, color: 'text-primary', label: 'Messages' },
  task: { icon: CheckSquare, color: 'text-orange-500', label: 'Tasks' },
  pomodoro: { icon: Timer, color: 'text-pink-500', label: 'Pomodoro' },
  group_invite: { icon: Users, color: 'text-cyan-500', label: 'Group Invites' },
  timetable_share: { icon: Calendar, color: 'text-yellow-500', label: 'Timetable Shares' },
  system: { icon: Settings, color: 'text-muted-foreground', label: 'System' },
  announcement: { icon: Megaphone, color: 'text-amber-500', label: 'Announcements' },
};

export default function NotificationHub() {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getFilteredNotifications,
  } = useNotifications();
  
  const {
    invitations: groupInvitations,
    loading: invitationsLoading,
    acceptInvitation,
    declineInvitation,
  } = useGroupInvitations();
  
  const [activeFilter, setActiveFilter] = useState<NotificationType | 'all' | 'invitations'>('all');

  const filteredNotifications = activeFilter === 'invitations' ? [] : getFilteredNotifications(activeFilter === 'all' ? 'all' : activeFilter);

  const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
    const date = new Date(notification.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(notification);
    return acc;
  }, {} as Record<string, typeof notifications>);

  const NotificationItem = ({ notification }: { notification: typeof notifications[0] }) => {
    const config = notificationConfig[notification.type];
    const Icon = config.icon;

    return (
      <div
        className={cn(
          "group p-4 rounded-lg border transition-all duration-300 hover:shadow-md cursor-pointer animate-fade-in",
          notification.is_read 
            ? "bg-background border-border/50" 
            : "bg-primary/5 border-primary/20"
        )}
        onClick={() => {
          if (!notification.is_read) markAsRead(notification.id);
          if (notification.link) navigate(notification.link);
        }}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
            notification.is_read ? "bg-muted" : "bg-primary/10"
          )}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className={cn(
                  "text-sm line-clamp-1",
                  !notification.is_read && "font-semibold"
                )}>
                  {notification.title}
                </p>
                {notification.message && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                {!notification.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GroupInvitationItem = ({ invitation }: { invitation: typeof groupInvitations[0] }) => {
    return (
      <div className="group p-4 rounded-lg border bg-primary/5 border-primary/20 transition-all duration-300 hover:shadow-md animate-fade-in">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={invitation.groups?.avatar_url || undefined} />
            <AvatarFallback className="bg-cyan-500/10 text-cyan-500">
              {invitation.groups?.name?.slice(0, 2).toUpperCase() || 'GR'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              Group Invitation: {invitation.groups?.name}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Invited by {invitation.profiles?.display_name || invitation.profiles?.username || 'Unknown'}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs text-cyan-500 border-cyan-500/30">
                Group Invite
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
              </span>
            </div>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => acceptInvitation(invitation.id)}
                className="flex-1"
              >
                <Check className="mr-1 h-3 w-3" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineInvitation(invitation.id)}
                className="flex-1"
              >
                <X className="mr-1 h-3 w-3" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover-scale"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Notification Hub</h1>
              {unreadCount + groupInvitations.length > 0 && (
                <Badge variant="destructive" className="animate-bounce-subtle">
                  {unreadCount + groupInvitations.length}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="gap-2 hover-scale"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Mark all read</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="hover-scale">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={clearAllNotifications}
                  className="text-destructive"
                >
                  Clear all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar filters */}
          <Card className="lg:col-span-1 h-fit sticky top-24 shadow-elegant animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filter by type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button
                variant={activeFilter === 'all' ? 'default' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => setActiveFilter('all')}
              >
                <Bell className="h-4 w-4" />
                All notifications
                <Badge variant="secondary" className="ml-auto">
                  {notifications.length + groupInvitations.length}
                </Badge>
              </Button>
              
              {/* Group Invitations filter */}
              <Button
                variant={activeFilter === 'invitations' ? 'default' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => setActiveFilter('invitations')}
              >
                <Users className={cn("h-4 w-4", activeFilter !== 'invitations' && "text-cyan-500")} />
                Group Invitations
                {groupInvitations.length > 0 && (
                  <Badge variant="destructive" className="ml-auto animate-pulse">
                    {groupInvitations.length}
                  </Badge>
                )}
              </Button>
              
              <Separator className="my-2" />
              
              {(Object.entries(notificationConfig) as [NotificationType, typeof notificationConfig[NotificationType]][]).map(([type, config]) => {
                const count = notifications.filter(n => n.type === type).length;
                const Icon = config.icon;
                
                return (
                  <Button
                    key={type}
                    variant={activeFilter === type ? 'default' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveFilter(type)}
                  >
                    <Icon className={cn("h-4 w-4", activeFilter !== type && config.color)} />
                    {config.label}
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-4">
            {loading || invitationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : activeFilter === 'invitations' ? (
              // Show only group invitations
              groupInvitations.length === 0 ? (
                <Card className="shadow-elegant animate-fade-in">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No group invitations</h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      You don't have any pending group invitations.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <div className="sticky top-20 z-10 py-2 bg-background/95 backdrop-blur">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Pending Group Invitations
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {groupInvitations.map(invitation => (
                      <GroupInvitationItem key={invitation.id} invitation={invitation} />
                    ))}
                  </div>
                </div>
              )
            ) : filteredNotifications.length === 0 && (activeFilter !== 'all' || groupInvitations.length === 0) ? (
              <Card className="shadow-elegant animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No notifications</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {activeFilter === 'all' 
                      ? "You're all caught up! New notifications will appear here."
                      : `No ${notificationConfig[activeFilter as NotificationType]?.label.toLowerCase()} yet.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Show group invitations at the top when viewing 'all' */}
                {activeFilter === 'all' && groupInvitations.length > 0 && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="sticky top-20 z-10 py-2 bg-background/95 backdrop-blur">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-cyan-500" />
                        Pending Group Invitations
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {groupInvitations.map(invitation => (
                        <GroupInvitationItem key={invitation.id} invitation={invitation} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Regular notifications */}
                {Object.entries(groupedNotifications).map(([date, notifs]) => (
                  <div key={date} className="space-y-3 animate-fade-in">
                    <div className="sticky top-20 z-10 py-2 bg-background/95 backdrop-blur">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {notifs.map(notification => (
                        <NotificationItem key={notification.id} notification={notification} />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
