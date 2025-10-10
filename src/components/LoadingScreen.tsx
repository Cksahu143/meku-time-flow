import { useEffect, useState } from 'react';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="text-center space-y-8">
        {/* Animated Pencil Drawing Logo */}
        <div className="relative w-48 h-48 mx-auto">
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full"
            style={{
              strokeDasharray: 1000,
              strokeDashoffset: 1000 - (progress * 10),
              transition: 'stroke-dashoffset 0.3s ease',
            }}
          >
            {/* Book shape */}
            <path
              d="M 40 60 L 40 180 L 160 180 L 160 60 Z"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Book spine */}
            <line
              x1="80"
              y1="60"
              x2="80"
              y2="180"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
            
            {/* Lines on pages */}
            <line x1="100" y1="90" x2="150" y2="90" stroke="hsl(var(--accent))" strokeWidth="2" />
            <line x1="100" y1="110" x2="150" y2="110" stroke="hsl(var(--accent))" strokeWidth="2" />
            <line x1="100" y1="130" x2="150" y2="130" stroke="hsl(var(--accent))" strokeWidth="2" />
            
            {/* Pencil */}
            <path
              d="M 150 40 L 170 20 L 180 30 L 160 50 Z"
              fill="hsl(var(--accent))"
              stroke="hsl(var(--accent))"
              strokeWidth="2"
              className="animate-bounce"
            />
          </svg>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            EducationAssist
          </h1>
          <p className="text-muted-foreground">Loading your school planner...</p>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
        </div>
      </div>
    </div>
  );
}
