import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BNHDELuZtxKn5fEunVueqfiEMrf0WEXeKLKYmbWZ5F3yotzd9CfQorI4EoG3LwS_wCYhKCCDGoSL_Xs0rdaQcjc';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushSubscription = () => {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;

    const subscribe = async () => {
      try {
        // Check auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check browser support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.log('Push notifications not supported');
          return;
        }

        // Check permission
        if (Notification.permission === 'denied') return;
        if (Notification.permission === 'default') {
          // Don't auto-prompt, wait for user to enable via settings
          return;
        }

        // Get SW registration
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisuallyShown: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          } as PushSubscriptionOptionsInit);
        }

        if (!subscription) return;

        const key = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');
        if (!key || !auth) return;

        const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
        const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

        // Upsert into push_subscriptions
        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh,
            auth: authKey,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,endpoint', ignoreDuplicates: false }
        );

        if (error) {
          // If conflict on endpoint, try without onConflict
          await supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh,
            auth: authKey,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          });
        }

        subscribedRef.current = true;
        console.log('Push subscription registered');
      } catch (err) {
        console.warn('Push subscription failed:', err);
      }
    };

    subscribe();
  }, []);
};
