import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMouseParallax } from '@/hooks/useMotion';

interface FloatingShapeProps {
  className?: string;
  size?: number;
  x: number;
  y: number;
  delay?: number;
  parallaxIntensity?: number;
}

const FloatingShape: React.FC<FloatingShapeProps> = ({
  className,
  size = 100,
  x,
  y,
  delay = 0,
  parallaxIntensity = 1,
}) => {
  const mousePosition = useMouseParallax(10 * parallaxIntensity);

  return (
    <motion.div
      className={className}
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        x: mousePosition.x * parallaxIntensity,
        y: mousePosition.y * parallaxIntensity,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 0.15,
        scale: 1,
        y: [0, -20, 0],
      }}
      transition={{
        opacity: { delay, duration: 1 },
        scale: { delay, duration: 1, type: 'spring' },
        y: {
          delay: delay + 1,
          duration: 6 + Math.random() * 4,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
    />
  );
};

// Aurora streak component
const AuroraStreak: React.FC<{ index: number }> = ({ index }) => {
  const top = useMemo(() => 10 + index * 20, [index]);
  const hue = useMemo(() => index % 3 === 0 ? '--primary' : index % 3 === 1 ? '--accent' : '--success', [index]);
  const dur = useMemo(() => 10 + index * 3, [index]);
  const height = useMemo(() => 60 + index * 20, [index]);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        top: `${top}%`,
        left: '-20%',
        width: '140%',
        height: height,
        background: `linear-gradient(90deg, transparent, hsl(var(${hue}) / 0.04), hsl(var(${hue}) / 0.08), hsl(var(${hue}) / 0.04), transparent)`,
        filter: 'blur(30px)',
        transform: `rotate(${-5 + index * 3}deg)`,
      }}
      animate={{
        x: ['-30%', '30%', '-30%'],
        opacity: [0.3, 0.7, 0.3],
      }}
      transition={{
        duration: dur,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 2,
      }}
    />
  );
};

// Micro particle
const MicroParticle: React.FC<{ index: number }> = ({ index }) => {
  const x = useMemo(() => Math.random() * 100, []);
  const y = useMemo(() => Math.random() * 100, []);
  const size = useMemo(() => 1.5 + Math.random() * 2.5, []);
  const dur = useMemo(() => 4 + Math.random() * 6, []);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
        background: index % 3 === 0
          ? 'hsl(var(--primary) / 0.3)'
          : index % 3 === 1
          ? 'hsl(var(--accent) / 0.25)'
          : 'hsl(var(--success) / 0.2)',
      }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0, 1.2, 0],
        y: [0, -40 - Math.random() * 30],
        x: [0, (Math.random() - 0.5) * 30],
      }}
      transition={{
        duration: dur,
        repeat: Infinity,
        delay: index * 0.6,
        ease: 'easeInOut',
      }}
    />
  );
};

export const FloatingBackground: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  if (disabled) return null;

  const shapes = [
    { x: 10, y: 20, size: 150, parallax: 0.5, color: 'bg-primary/20' },
    { x: 80, y: 15, size: 100, parallax: 0.8, color: 'bg-accent-glow/20' },
    { x: 60, y: 70, size: 180, parallax: 0.3, color: 'bg-primary/10' },
    { x: 20, y: 80, size: 120, parallax: 0.6, color: 'bg-accent-glow/15' },
    { x: 90, y: 60, size: 80, parallax: 1, color: 'bg-primary/15' },
    { x: 45, y: 10, size: 200, parallax: 0.2, color: 'bg-success/8' },
    { x: 70, y: 45, size: 90, parallax: 0.9, color: 'bg-primary/12' },
    { x: 5, y: 55, size: 130, parallax: 0.4, color: 'bg-accent/10' },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Aurora streaks */}
      {Array.from({ length: 4 }).map((_, i) => (
        <AuroraStreak key={`aurora-${i}`} index={i} />
      ))}

      {/* Floating shapes */}
      {shapes.map((shape, i) => (
        <FloatingShape
          key={i}
          className={`absolute rounded-full blur-3xl ${shape.color}`}
          size={shape.size}
          x={shape.x}
          y={shape.y}
          delay={i * 0.15}
          parallaxIntensity={shape.parallax}
        />
      ))}

      {/* Micro particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <MicroParticle key={`particle-${i}`} index={i} />
      ))}

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Subtle dot overlay */}
      <div className="absolute inset-0 dot-pattern opacity-30" />

      {/* Vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, hsl(var(--background) / 0.4) 100%)',
        }}
      />
    </div>
  );
};
