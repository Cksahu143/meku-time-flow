import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const loadingTexts = ['Loading your workspace', 'Preparing dashboard', 'Syncing data', 'Almost ready'];

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    setShowContent(true);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(timer); return 100; }
        return prev + 3;
      });
    }, 30);
    const textTimer = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 1800);
    return () => { clearInterval(timer); clearInterval(textTimer); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Simple ambient background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-30"
          style={{ background: 'hsl(var(--primary) / 0.15)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20"
          style={{ background: 'hsl(var(--accent) / 0.1)' }}
        />
      </div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="text-center space-y-8 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Logo */}
            <motion.div
              className="relative w-24 h-24 mx-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {/* Gradient border ring */}
              <div className="absolute -inset-[3px] rounded-3xl overflow-hidden">
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-[3px] rounded-[20px] bg-background" />
              </div>

              <motion.div className="absolute inset-0 rounded-3xl bg-gradient-primary shadow-primary flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 40 40" className="w-12 h-12 text-primary-foreground relative z-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M8 10 L8 34 L32 34 L32 10 Z" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
                  <motion.path d="M16 10 L16 34" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.6 }} />
                  <motion.path d="M20 18 L28 18" stroke="hsl(var(--accent))" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.8 }} />
                  <motion.path d="M20 23 L28 23" stroke="hsl(var(--accent))" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.9 }} />
                  <motion.path d="M20 28 L26 28" stroke="hsl(var(--accent))" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 1.0 }} />
                </svg>
              </motion.div>
            </motion.div>

            {/* App Name */}
            <motion.div className="space-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <h1 className="font-display text-5xl font-extrabold tracking-tight text-gradient-blue">EDAS</h1>
              <p className="text-sm text-muted-foreground font-medium tracking-wide">Education Assist</p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div className="w-56 mx-auto space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--gradient-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={textIndex}
                    className="text-xs text-muted-foreground font-medium"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {loadingTexts[textIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="text-[10px] text-muted-foreground/50 font-mono">{progress}%</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
