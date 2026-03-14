import React from 'react';
import { motion } from 'framer-motion';

interface GlowOrbProps {
  color?: string;
  size?: number;
  x?: string;
  y?: string;
  delay?: number;
  blur?: number;
}

export const GlowOrb: React.FC<GlowOrbProps> = ({
  color = 'var(--primary)',
  size = 200,
  x = '50%',
  y = '50%',
  delay = 0,
  blur = 60,
}) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      left: x,
      top: y,
      background: `radial-gradient(circle, hsl(${color} / 0.15) 0%, transparent 70%)`,
      filter: `blur(${blur}px)`,
      transform: 'translate(-50%, -50%)',
    }}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{
      opacity: [0.3, 0.6, 0.3],
      scale: [0.8, 1.2, 0.8],
    }}
    transition={{
      duration: 6 + delay,
      repeat: Infinity,
      ease: 'easeInOut',
      delay,
    }}
  />
);

export const MeteorShower: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          width: 2,
          height: 60 + Math.random() * 40,
          top: `${Math.random() * 50}%`,
          left: `${Math.random() * 100}%`,
          background: `linear-gradient(to bottom, hsl(var(--primary) / 0.4), transparent)`,
          borderRadius: 999,
          transform: 'rotate(215deg)',
        }}
        initial={{ opacity: 0, x: -100, y: -100 }}
        animate={{
          opacity: [0, 1, 0],
          x: [0, 300],
          y: [0, 300],
        }}
        transition={{
          duration: 1.5 + Math.random(),
          repeat: Infinity,
          delay: i * 3 + Math.random() * 5,
          ease: 'linear',
          repeatDelay: 4 + Math.random() * 8,
        }}
      />
    ))}
  </div>
);
