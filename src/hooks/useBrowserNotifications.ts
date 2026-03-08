import { useEffect, useRef, useCallback } from 'react';
import { useNotificationPreferences } from './useNotificationPreferences';

type NotificationType = 'messages' | 'tasks' | 'pomodoro' | 'groupInvites' | 'mentions' | 'replies' | 'follows' | 'reactions' | 'system' | 'announcements';

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export const useBrowserNotifications = () => {
  const { preferences, shouldShowNotification } = useNotificationPreferences();
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        swRegistrationRef.current = registration;
        console.log('Service Worker registered for notifications');
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    body: string,
    options?: {
      url?: string;
      tag?: string;
      silent?: boolean;
    }
  ) => {
    if (!shouldShowNotification(type)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // Mac-specific: append a friendly suffix
    const macSuffix = isMac() ? '\n📱 From EDAS on your Mac' : '';
    const finalBody = body + macSuffix;

    const tag = options?.tag || type;
    const notifData = {
      url: options?.url || '/app',
    };

    // Use service worker to show notification (works in background & when closed)
    if (swRegistrationRef.current?.active) {
      swRegistrationRef.current.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body: finalBody,
        tag,
        data: notifData,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
      return;
    }

    // Fallback: direct Notification API (only works when tab exists)
    if (document.visibilityState !== 'visible') {
      new Notification(title, {
        body: finalBody,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag,
        requireInteraction: false,
      });
    }
  }, [shouldShowNotification]);

  return { showNotification, requestPermission };
};
