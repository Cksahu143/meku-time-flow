import React, { useState, useEffect } from 'react';
import { Bell, Clock, MessageSquare, CheckSquare, Timer, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { toast } from 'sonner';

export const NotificationPreferences: React.FC = () => {
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
        // Register service worker
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

  return (
    <div className="space-y-6 animate-fade-in">
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
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center transition-all group-hover:scale-110">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="messages" className="cursor-pointer">Messages</Label>
                <p className="text-sm text-muted-foreground">New messages in groups and direct chats</p>
              </div>
            </div>
            <Switch
              id="messages"
              checked={localPrefs.messages}
              onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, messages: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center transition-all group-hover:scale-110">
                <CheckSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="tasks" className="cursor-pointer">Tasks</Label>
                <p className="text-sm text-muted-foreground">Reminders for due and overdue tasks</p>
              </div>
            </div>
            <Switch
              id="tasks"
              checked={localPrefs.tasks}
              onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, tasks: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center transition-all group-hover:scale-110">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="pomodoro" className="cursor-pointer">Pomodoro</Label>
                <p className="text-sm text-muted-foreground">Session complete notifications</p>
              </div>
            </div>
            <Switch
              id="pomodoro"
              checked={localPrefs.pomodoro}
              onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, pomodoro: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center transition-all group-hover:scale-110">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="groupInvites" className="cursor-pointer">Group Invites</Label>
                <p className="text-sm text-muted-foreground">New group invitation alerts</p>
              </div>
            </div>
            <Switch
              id="groupInvites"
              checked={localPrefs.groupInvites}
              onCheckedChange={(checked) => setLocalPrefs({ ...localPrefs, groupInvites: checked })}
            />
          </div>
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
