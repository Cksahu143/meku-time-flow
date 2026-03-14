import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedGradientBorderProps {
  children: React.ReactNode;
  className?: string;
  borderWidth?: number;
  speed?: number;
  active?: boolean;
}

export const AnimatedGradientBorder: React.FC<AnimatedGradientBorderProps> = ({
  children,
  className,
  borderWidth = 2,
  speed = 3,
  active = true,
}) => {
  return (
    <div className={cn('relative rounded-2xl', className)}>
      {active && (
        <motion.div
          className="absolute -inset-px rounded-2xl overflow-hidden"
          style={{ padding: borderWidth }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--success)), hsl(var(--primary)))`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
      <div className="relative bg-card rounded-2xl z-10">
        {children}
      </div>
    </div>
  );
};
