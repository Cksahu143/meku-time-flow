import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'star';
  velocityX: number;
  velocityY: number;
  delay: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  '#FFD700',
  '#FF6B6B',
  '#4ECDC4',
  '#A78BFA',
  '#F472B6',
  '#34D399',
  '#FBBF24',
];

function generateParticles(count: number, originX = 50, originY = 50): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.random() * 360 * Math.PI) / 180;
    const velocity = 200 + Math.random() * 600;
    return {
      id: i,
      x: originX,
      y: originY,
      rotation: Math.random() * 720 - 360,
      scale: 0.4 + Math.random() * 0.8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: (['circle', 'square', 'triangle', 'star'] as const)[Math.floor(Math.random() * 4)],
      velocityX: Math.cos(angle) * velocity,
      velocityY: Math.sin(angle) * velocity,
      delay: Math.random() * 0.15,
    };
  });
}

const ShapeComponent = ({ shape, color }: { shape: string; color: string }) => {
  switch (shape) {
    case 'circle':
      return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />;
    case 'square':
      return <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />;
    case 'triangle':
      return (
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: `10px solid ${color}`,
          }}
        />
      );
    case 'star':
      return <div className="text-lg leading-none" style={{ color }}>✦</div>;
    default:
      return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />;
  }
};

interface ConfettiExplosionProps {
  trigger: boolean;
  onComplete?: () => void;
  particleCount?: number;
  originX?: number;
  originY?: number;
  duration?: number;
}

export function ConfettiExplosion({
  trigger,
  onComplete,
  particleCount = 60,
  originX = 50,
  originY = 50,
  duration = 2500,
}: ConfettiExplosionProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setParticles(generateParticles(particleCount, originX, originY));
      setActive(true);
      const timeout = setTimeout(() => {
        setActive(false);
        setParticles([]);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timeout);
    }
  }, [trigger]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: p.velocityX,
              y: [p.velocityY * 0.3, p.velocityY + 200],
              scale: [0, p.scale, p.scale * 0.3],
              rotate: p.rotation,
            }}
            transition={{
              duration: duration / 1000,
              delay: p.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
              y: { type: 'spring', stiffness: 20, damping: 8 },
            }}
          >
            <ShapeComponent shape={p.shape} color={p.color} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Sparkle burst for smaller celebrations
export function SparkleBurst({ trigger, size = 120 }: { trigger: boolean; size?: number }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setActive(true);
      const t = setTimeout(() => setActive(false), 1200);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  if (!active) return null;

  const sparkles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360;
    const rad = (angle * Math.PI) / 180;
    return {
      id: i,
      x: Math.cos(rad) * size,
      y: Math.sin(rad) * size,
      delay: i * 0.03,
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute w-2 h-2 rounded-full bg-primary"
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0],
            x: s.x,
            y: s.y,
            scale: [0, 1.5, 0],
          }}
          transition={{ duration: 0.8, delay: s.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
