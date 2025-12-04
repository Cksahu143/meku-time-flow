import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Clock, MessageSquare, CheckSquare, Timer, Users, 
  AtSign, Reply, UserPlus, Heart, Settings, Megaphone, ExternalLink 
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';

export const NotificationPreferences: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, savePreferences, loading } = useNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('Service Worker registered:', registration);
        }
        
        toast.success('Browser notifications enabled!');
        setLocalPrefs({ ...localPrefs, browserNotifications: true });
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  const handleSave = () => {
    savePreferences(localPrefs);
    toast.success('Notification preferences saved!');
  };

  if (loading) {
    return <div className="animate-pulse">Loading preferences...</div>;
  }

  const notificationTypes = [
    { id: 'messages', icon: MessageSquare, label: 'Messages', description: 'New messages in groups and direct chats' },
    { id: 'mentions', icon: AtSign, label: 'Mentions', description: 'When someone @mentions you in a chat' },
    { id: 'replies', icon: Reply, label: 'Replies', description: 'Replies to your messages' },
    { id: 'follows', icon: UserPlus, label: 'Follows', description: 'When someone follows you' },
    { id: 'reactions', icon: Heart, label: 'Reactions', description: 'Reactions to your posts and messages' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks', description: 'Reminders for due and overdue tasks' },
    { id: 'pomodoro', icon: Timer, label: 'Pomodoro', description: 'Session complete notifications' },
    { id: 'groupInvites', icon: Users, label: 'Group Invites', description: 'New group invitation alerts' },
    { id: 'system', icon: Settings, label: 'System', description: 'Important system updates and alerts' },
    { id: 'announcements', icon: Megaphone, label: 'Announcements', description: 'App announcements and news' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Notification Hub Link */}
      <Card className="border-primary/30 bg-primary/5 shadow-elegant hover-lift transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Notification Hub</h3>
                <p className="text-sm text-muted-foreground">View all your notifications in one place</p>
              </div>
            </div>
            <Button onClick={() => navigate('/notifhub')} className="gap-2 hover-scale">
              <ExternalLink className="h-4 w-4" />
              Open Hub
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-elegant hover-lift transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Receive alerts even when the app is closed or in the background
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissionStatus === 'granted' ? (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Notifications Enabled</p>
                  <p className="text-sm text-muted-foreground">You'll receive push notifications</p>
                </div>
              </div>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            </div>
          ) : (
            <Button 
              onClick={requestNotificationPermission}
              className="w-full group hover-scale"
            >
              <Bell className="h-4 w-4 mr-2 transition-transform group-hover:rotate-12" />
              Enable Browser Notifications
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-elegant hover-lift transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((type, index) => (
            <React.Fragment key={type.id}>
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center transition-all group-hover:scale-110">
                    <type.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
                <Switch
                  id={type.id}
                  checked={localPrefs[type.id as keyof typeof localPrefs] as boolean}
                  onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, [type.id]: checked })}
                />
              </div>
              {index < notificationTypes.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-elegant hover-lift transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set do-not-disturb times when you won't receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quietHours">Enable Quiet Hours</Label>
            <Switch
              id="quietHours"
              checked={localPrefs.quietHoursEnabled}
              onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, quietHoursEnabled: checked })}
            />
          </div>

          {localPrefs.quietHoursEnabled && (
            <div className="space-y-4 animate-slide-down pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={localPrefs.quietHoursStart}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, quietHoursStart: e.target.value })}
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={localPrefs.quietHoursEnd}
                    onChange={(e) => setLocalPrefs({ ...localPrefs, quietHoursEnd: e.target.value })}
                    className="transition-all focus:scale-[1.02]"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Clock className="h-4 w-4 inline mr-2" />
                Notifications will be silenced from {localPrefs.quietHoursStart} to {localPrefs.quietHoursEnd}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full hover-scale shadow-elegant">
        Save Preferences
      </Button>
    </div>
  );
};
