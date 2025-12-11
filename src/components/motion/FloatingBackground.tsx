import React from 'react';
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

export const FloatingBackground: React.FC<{ disabled?: boolean }> = ({ disabled = false }) => {
  if (disabled) return null;

  const shapes = [
    { x: 10, y: 20, size: 150, parallax: 0.5, color: 'bg-primary/20' },
    { x: 80, y: 15, size: 100, parallax: 0.8, color: 'bg-accent-glow/20' },
    { x: 60, y: 70, size: 180, parallax: 0.3, color: 'bg-primary/10' },
    { x: 20, y: 80, size: 120, parallax: 0.6, color: 'bg-accent-glow/15' },
    { x: 90, y: 60, size: 80, parallax: 1, color: 'bg-primary/15' },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Floating shapes */}
      {shapes.map((shape, i) => (
        <FloatingShape
          key={i}
          className={`absolute rounded-full blur-3xl ${shape.color}`}
          size={shape.size}
          x={shape.x}
          y={shape.y}
          delay={i * 0.2}
          parallaxIntensity={shape.parallax}
        />
      ))}

      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};
