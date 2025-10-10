import { ReactNode } from 'react';
import { ViewType } from '@/types';

interface AnimatedBackgroundProps {
  children: ReactNode;
  viewType: ViewType;
}

export function AnimatedBackground({ children, viewType }: AnimatedBackgroundProps) {
  const getBackgroundElements = () => {
    switch (viewType) {
      case 'calendar':
        return (
          <>
            {[...Array(5)].map((_, i) => (
              <div
                key={`cloud-${i}`}
                className="absolute opacity-20 animate-float"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 2}s`,
                  animationDuration: `${15 + i * 3}s`,
                }}
              >
                ☁️
              </div>
            ))}
          </>
        );
      case 'todo':
        return (
          <>
            {[...Array(8)].map((_, i) => (
              <div
                key={`book-${i}`}
                className="absolute text-4xl opacity-10 animate-float"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 1.5}s`,
                  animationDuration: `${12 + i * 2}s`,
                }}
              >
                📚
              </div>
            ))}
          </>
        );
      case 'pomodoro':
        return (
          <>
            {[...Array(6)].map((_, i) => (
              <div
                key={`timer-${i}`}
                className="absolute text-3xl opacity-10 animate-pulse"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${3 + i}s`,
                }}
              >
                ⏱️
              </div>
            ))}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {getBackgroundElements()}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
