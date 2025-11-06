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
            {[...Array(8)].map((_, i) => (
              <div
                key={`cloud-${i}`}
                className="absolute opacity-20 animate-float"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 2}s`,
                  animationDuration: `${15 + i * 3}s`,
                  fontSize: `${2 + Math.random() * 2}rem`,
                }}
              >
                {i % 3 === 0 ? '☁️' : i % 3 === 1 ? '📅' : '✨'}
              </div>
            ))}
          </>
        );
      case 'todo':
        return (
          <>
            {[...Array(12)].map((_, i) => (
              <div
                key={`book-${i}`}
                className="absolute text-4xl opacity-10 animate-float"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 1.5}s`,
                  animationDuration: `${12 + i * 2}s`,
                  fontSize: `${2.5 + Math.random() * 1.5}rem`,
                }}
              >
                {i % 4 === 0 ? '📚' : i % 4 === 1 ? '✏️' : i % 4 === 2 ? '📝' : '✅'}
              </div>
            ))}
          </>
        );
      case 'pomodoro':
        return (
          <>
            {[...Array(10)].map((_, i) => (
              <div
                key={`timer-${i}`}
                className="absolute text-3xl opacity-10 animate-pulse"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${3 + i}s`,
                  fontSize: `${2 + Math.random() * 1.5}rem`,
                }}
              >
                {i % 3 === 0 ? '⏱️' : i % 3 === 1 ? '⏰' : '🍅'}
              </div>
            ))}
          </>
        );
      case 'groups':
        return (
          <>
            {[...Array(15)].map((_, i) => (
              <div
                key={`people-${i}`}
                className="absolute text-3xl opacity-10 animate-float"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 1}s`,
                  animationDuration: `${10 + i * 2}s`,
                  fontSize: `${2 + Math.random() * 2}rem`,
                }}
              >
                {i % 5 === 0 ? '👥' : i % 5 === 1 ? '👫' : i % 5 === 2 ? '👬' : i % 5 === 3 ? '👭' : '🗣️'}
              </div>
            ))}
          </>
        );
      case 'timetable':
        return (
          <>
            {[...Array(10)].map((_, i) => (
              <div
                key={`schedule-${i}`}
                className="absolute text-3xl opacity-10 animate-float"
                style={{
                  top: `${Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 1.2}s`,
                  animationDuration: `${14 + i * 2}s`,
                  fontSize: `${2 + Math.random() * 1.5}rem`,
                }}
              >
                {i % 4 === 0 ? '📊' : i % 4 === 1 ? '📋' : i % 4 === 2 ? '🕐' : '📌'}
              </div>
            ))}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex-1 h-full overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {getBackgroundElements()}
      </div>
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
