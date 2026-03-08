import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cursorX = useSpring(mouseX, { stiffness: 500, damping: 28, mass: 0.5 });
  const cursorY = useSpring(mouseY, { stiffness: 500, damping: 28, mass: 0.5 });
  const trailX = useSpring(mouseX, { stiffness: 120, damping: 20, mass: 1 });
  const trailY = useSpring(mouseY, { stiffness: 120, damping: 20, mass: 1 });

  useEffect(() => {
    // Only on non-touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const down = () => setClicking(true);
    const up = () => setClicking(false);
    const leave = () => setVisible(false);
    const enter = () => setVisible(true);

    const checkHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('a, button, [role="button"], input, select, textarea, label, [data-cursor-hover]');
      setHovering(!!isInteractive);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mousemove', checkHover);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);

    // Hide default cursor
    document.documentElement.style.cursor = 'none';
    const style = document.createElement('style');
    style.id = 'custom-cursor-style';
    style.textContent = '*, *::before, *::after { cursor: none !important; }';
    document.head.appendChild(style);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousemove', checkHover);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
      document.documentElement.style.cursor = '';
      document.getElementById('custom-cursor-style')?.remove();
    };
  }, [mouseX, mouseY, visible]);

  // Don't render on touch devices
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999]" aria-hidden="true">
      {/* Outer trail ring */}
      <motion.div
        className="absolute rounded-full border-2 border-primary/40"
        style={{
          x: trailX,
          y: trailY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: hovering ? 48 : clicking ? 20 : 32,
          height: hovering ? 48 : clicking ? 20 : 32,
          opacity: visible ? (hovering ? 0.6 : 0.3) : 0,
          borderColor: hovering ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      />

      {/* Inner dot */}
      <motion.div
        className="absolute rounded-full bg-primary"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: clicking ? 12 : hovering ? 6 : 8,
          height: clicking ? 12 : hovering ? 6 : 8,
          opacity: visible ? 1 : 0,
          scale: clicking ? 0.8 : 1,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      />

      {/* Glow effect on hover */}
      {hovering && (
        <motion.div
          className="absolute rounded-full bg-primary/10"
          style={{
            x: trailX,
            y: trailY,
            translateX: '-50%',
            translateY: '-50%',
          }}
          initial={{ width: 0, height: 0, opacity: 0 }}
          animate={{ width: 64, height: 64, opacity: 0.5 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        />
      )}
    </div>
  );
}
