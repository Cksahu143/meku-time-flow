import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreferences {
  messages: boolean;
  tasks: boolean;
  pomodoro: boolean;
  groupInvites: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  browserNotifications: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  tasks: true,
  pomodoro: true,
  groupInvites: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  browserNotifications: false,
};

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const stored = localStorage.getItem(`notification_prefs_${user.id}`);
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      localStorage.setItem(`notification_prefs_${user.id}`, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  const isQuietHours = () => {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const start = preferences.quietHoursStart;
    const end = preferences.quietHoursEnd;

    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      return currentTime >= start || currentTime <= end;
    }
  };

  const shouldShowNotification = (type: keyof Pick<NotificationPreferences, 'messages' | 'tasks' | 'pomodoro' | 'groupInvites'>) => {
    if (isQuietHours()) return false;
    return preferences[type];
  };

  return {
    preferences,
    loading,
    savePreferences,
    shouldShowNotification,
    isQuietHours,
  };
};
