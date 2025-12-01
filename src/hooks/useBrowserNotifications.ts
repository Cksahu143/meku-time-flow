import { useEffect } from 'react';
import { useNotificationPreferences } from './useNotificationPreferences';

export const useBrowserNotifications = () => {
  const { preferences, shouldShowNotification } = useNotificationPreferences();

  useEffect(() => {
    // Register service worker on mount
    if ('serviceWorker' in navigator && preferences.browserNotifications) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, [preferences.browserNotifications]);

  const showNotification = (
    type: 'messages' | 'tasks' | 'pomodoro' | 'groupInvites',
    title: string,
    body: string,
    options?: NotificationOptions
  ) => {
    // Check if we should show this notification
    if (!shouldShowNotification(type)) {
      return;
    }

    // Check if browser notifications are enabled
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      // If the page is visible, we can just show a toast instead
      if (document.visibilityState === 'visible') {
        return; // Let toast handle it
      }

      // Show browser notification when tab is hidden
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: type,
        requireInteraction: false,
        ...options,
      });
    }
  };

  return { showNotification };
};
