import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--primary-glow))',
  'hsl(var(--accent-glow))',
];

const SparkleParticle: React.FC<{ sparkle: Sparkle }> = ({ sparkle }) => (
  <motion.div
    className="fixed pointer-events-none z-[9999]"
    style={{
      left: sparkle.x,
      top: sparkle.y,
    }}
    initial={{ opacity: 1, scale: 0, rotate: sparkle.rotation }}
    animate={{
      opacity: [1, 0.8, 0],
      scale: [0, 1, 0.5],
      y: [0, -20 - Math.random() * 20],
      x: [(Math.random() - 0.5) * 20],
      rotate: sparkle.rotation + 180,
    }}
    exit={{ opacity: 0, scale: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    <svg
      width={sparkle.size}
      height={sparkle.size}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M10 0L12.5 7.5L20 10L12.5 12.5L10 20L7.5 12.5L0 10L7.5 7.5L10 0Z"
        fill={sparkle.color}
      />
    </svg>
  </motion.div>
);

export const CursorSparkle: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const idRef = useRef(0);
  const lastRef = useRef(0);

  const addSparkle = useCallback((e: MouseEvent) => {
    const now = Date.now();
    if (now - lastRef.current < 50) return; // throttle
    lastRef.current = now;

    const newSparkle: Sparkle = {
      id: idRef.current++,
      x: e.clientX - 5,
      y: e.clientY - 5,
      size: 8 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
    };

    setSparkles(prev => [...prev.slice(-8), newSparkle]);

    setTimeout(() => {
      setSparkles(prev => prev.filter(s => s.id !== newSparkle.id));
    }, 700);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('mousemove', addSparkle);
    return () => window.removeEventListener('mousemove', addSparkle);
  }, [enabled, addSparkle]);

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {sparkles.map(sparkle => (
        <SparkleParticle key={sparkle.id} sparkle={sparkle} />
      ))}
    </AnimatePresence>
  );
};
