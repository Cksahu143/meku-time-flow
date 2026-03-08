import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Orbiting particle component
const OrbitingParticle = ({ index, total }: { index: number; total: number }) => {
  const angle = (360 / total) * index;
  const radius = 52 + (index % 3) * 8;
  const duration = 4 + (index % 3) * 1.5;
  const size = 3 + (index % 3);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: index % 2 === 0
          ? 'hsl(var(--primary))'
          : 'hsl(var(--accent))',
        top: '50%',
        left: '50%',
      }}
      animate={{
        rotate: [angle, angle + 360],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
        delay: index * 0.15,
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: -radius,
          left: -size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'inherit',
        }}
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
      />
    </motion.div>
  );
};

// Floating ambient particle
const FloatingParticle = ({ index }: { index: number }) => {
  const x = useMemo(() => Math.random() * 100, []);
  const y = useMemo(() => Math.random() * 100, []);
  const size = useMemo(() => 2 + Math.random() * 4, []);
  const dur = useMemo(() => 3 + Math.random() * 4, []);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: index % 3 === 0
          ? 'hsl(var(--primary) / 0.4)'
          : index % 3 === 1
          ? 'hsl(var(--accent) / 0.3)'
          : 'hsl(var(--success) / 0.3)',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1, 0],
        y: [0, -30 - Math.random() * 40, -60],
      }}
      transition={{
        duration: dur,
        repeat: Infinity,
        delay: index * 0.4,
        ease: 'easeInOut',
      }}
    />
  );
};

const loadingTexts = [
  'Loading your workspace',
  'Preparing dashboard',
  'Syncing data',
  'Almost ready',
];

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [textIndex, setTextIndex] = useState(0);

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

    const textTimer = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 1800);

    return () => {
      clearInterval(timer);
      clearInterval(textTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Animated mesh background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] animate-morph"
          style={{ background: 'hsl(var(--primary) / 0.08)' }}
          animate={{ scale: [1, 1.2, 1], x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] animate-morph"
          style={{ background: 'hsl(var(--accent) / 0.06)', animationDelay: '-3s' }}
          animate={{ scale: [1, 1.15, 1], x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[80px]"
          style={{ background: 'hsl(var(--success) / 0.04)' }}
          animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </div>

      <AnimatePresence>
        {showContent && (
          <motion.div
            className="text-center space-y-8 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Logo with orbiting particles */}
            <motion.div
              className="relative w-28 h-28 mx-auto"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              {/* Orbiting particles */}
              {Array.from({ length: 8 }).map((_, i) => (
                <OrbitingParticle key={i} index={i} total={8} />
              ))}

              <div className="absolute inset-0 rounded-3xl bg-gradient-primary shadow-primary rotate-12 opacity-20" />
              <motion.div
                className="absolute inset-0 rounded-3xl bg-gradient-primary shadow-primary flex items-center justify-center"
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg viewBox="0 0 40 40" className="w-14 h-14 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              </motion.div>

              {/* Pulse rings - multiple */}
              {[0, 0.6, 1.2].map((delay, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-[-8px] rounded-[20px] border-2 border-primary/20"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay }}
                />
              ))}
            </motion.div>

            {/* App Name with text scramble effect */}
            <motion.div
              className="space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.h1
                className="font-display text-5xl font-extrabold tracking-tight text-gradient-blue"
                initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                EDAS
              </motion.h1>
              <motion.p
                className="text-sm text-muted-foreground font-medium tracking-wide"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                Education Assist
              </motion.p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              className="w-64 mx-auto space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full relative"
                  style={{ background: 'var(--gradient-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.15, ease: 'linear' }}
                >
                  {/* Shimmer on progress bar */}
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.3) 50%, transparent 100%)',
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={textIndex}
                    className="text-xs text-muted-foreground font-medium"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {loadingTexts[textIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Percentage */}
              <motion.p
                className="text-[10px] text-muted-foreground/50 font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                {progress}%
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}