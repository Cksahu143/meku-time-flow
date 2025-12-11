import React from 'react';
import { motion } from 'framer-motion';
import { useTilt } from '@/hooks/useMotion';
import { cn } from '@/lib/utils';

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  tiltIntensity?: number;
  glowOnHover?: boolean;
  delay?: number;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className,
  tiltIntensity = 8,
  glowOnHover = true,
  delay = 0,
}) => {
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTilt(tiltIntensity);

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-card/80 backdrop-blur-sm',
        'transition-shadow duration-300',
        glowOnHover && 'hover:shadow-glow',
        className
      )}
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay,
        duration: 0.5,
        type: 'spring',
        stiffness: 100,
        damping: 15,
      }}
      whileHover={{ scale: 1.02 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};
