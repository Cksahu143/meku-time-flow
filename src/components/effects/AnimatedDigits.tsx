import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface AnimatedDigitProps {
  value: string;
  className?: string;
}

// Single digit with spring-physics flip animation
function FlipDigit({ digit, className }: { digit: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden inline-flex items-center justify-center ${className}`} style={{ width: '1ch' }}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          className="inline-block"
          initial={{ y: -40, opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ y: 40, opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 25,
            mass: 0.8,
          }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// Full timer display: "MM:SS" with individually animated digits
export function AnimatedTimer({ timeInSeconds, className }: { timeInSeconds: number; className?: string }) {
  const mins = Math.floor(timeInSeconds / 60);
  const secs = timeInSeconds % 60;
  const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className={`flex items-center justify-center font-mono ${className}`}>
      {formatted.split('').map((char, i) => (
        char === ':' ? (
          <motion.span
            key="colon"
            className="inline-block mx-0.5"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            :
          </motion.span>
        ) : (
          <FlipDigit key={`pos-${i}`} digit={char} className={className} />
        )
      ))}
    </div>
  );
}

// Animated counter number with spring interpolation
export function SpringCounter({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 100, damping: 20, mass: 1 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (v) => {
      setDisplay(Math.round(v));
    });
    return unsubscribe;
  }, [springValue]);

  return (
    <motion.span
      className={className}
      key={value}
      initial={{ scale: 1.3, color: 'hsl(var(--primary))' }}
      animate={{ scale: 1, color: 'hsl(var(--primary))' }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      {display}
    </motion.span>
  );
}
