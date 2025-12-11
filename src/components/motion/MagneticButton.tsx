import React from 'react';
import { motion } from 'framer-motion';
import { useMagnetic } from '@/hooks/useMotion';
import { cn } from '@/lib/utils';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
}) => {
  const { ref, springX, springY, handleMouseMove, handleMouseLeave } = useMagnetic(0.3);

  const baseStyles = 'relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:shadow-glow',
    outline: 'border border-border bg-transparent hover:bg-accent',
    ghost: 'bg-transparent hover:bg-accent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      style={{ x: springX, y: springY }}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
};
