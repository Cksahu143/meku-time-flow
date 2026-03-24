import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// ─── What this component does ───
// 1. Checks if a new service worker is waiting to activate (= app update available)
// 2. Shows a small banner telling the user to refresh
// 3. On click, tells the waiting SW to activate and reloads the page

export const PWAUpdatePrompt: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // When the browser finishes registering the SW, check for updates
    navigator.serviceWorker.getRegistration().then(registration => {
      if (!registration) return;

      // If a new SW is already waiting
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdate(true);
      }

      // Listen for new SW installations
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // When the new SW finishes installing and is waiting
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });
    });

    // Also listen for controllerchange (after skipWaiting)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Tell the waiting SW to activate immediately
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!showUpdate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999]"
      >
        <div className="bg-primary text-primary-foreground rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">A new version of Edas is available</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpdate}
            className="text-xs"
          >
            Update now
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
