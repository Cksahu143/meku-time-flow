import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowContent(true);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 25);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: 'hsl(var(--primary) / 0.08)' }}
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
          style={{ background: 'hsl(var(--accent) / 0.06)' }}
          animate={{ scale: [1, 1.15, 1], x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="text-center space-y-8 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Logo mark */}
            <motion.div
              className="relative w-24 h-24 mx-auto"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-primary shadow-primary rotate-12 opacity-20" />
              <div className="absolute inset-0 rounded-3xl bg-gradient-primary shadow-primary flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-12 h-12 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="M8 10 L8 34 L32 34 L32 10 Z"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
                  />
                  <motion.path
                    d="M16 10 L16 34"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                  />
                  <motion.path
                    d="M20 18 L28 18"
                    stroke="hsl(var(--accent))"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 1.1 }}
                  />
                  <motion.path
                    d="M20 23 L28 23"
                    stroke="hsl(var(--accent))"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 1.3 }}
                  />
                  <motion.path
                    d="M20 28 L26 28"
                    stroke="hsl(var(--accent))"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3, delay: 1.5 }}
                  />
                </svg>
              </div>
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-[-8px] rounded-[20px] border-2 border-primary/20"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            {/* App Name */}
            <motion.div
              className="space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-gradient-blue">
                EDAS
              </h1>
              <p className="text-sm text-muted-foreground font-medium tracking-wide">
                Education Assist
              </p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              className="w-56 mx-auto space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--gradient-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.15, ease: 'linear' }}
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <p className="text-xs text-muted-foreground font-medium">Loading your workspace</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
