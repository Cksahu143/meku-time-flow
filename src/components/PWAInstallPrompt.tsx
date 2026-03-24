import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// ─── What this component does ───
// 1. Listens for the browser's "beforeinstallprompt" event (fired when the app is installable)
// 2. Shows a small banner at the bottom of the screen inviting the user to install
// 3. On click, triggers the native browser install dialog
// 4. Remembers if the user dismissed it (localStorage) so it doesn't nag them

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'edas-pwa-install-dismissed';
const DISMISS_DAYS = 7; // Don't show again for 7 days after dismissal

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if already installed as PWA
  useEffect(() => {
    // matchMedia check for standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    // iOS Safari standalone check
    if ((navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }
  }, []);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    if (isInstalled) return;

    // Check if user recently dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault(); // Prevent the default mini-infobar
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    // Show the native browser install prompt
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setShowBanner(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  // Listen for service worker updates and show a reload banner
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        // The service worker was updated — the page will use the new version on next load
        console.log('[PWA] App updated to version', event.data.version);
      }
    });
  }, []);

  if (isInstalled || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install Edas</p>
            <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
          </div>
          <Button size="sm" onClick={handleInstall} className="flex-shrink-0 gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
