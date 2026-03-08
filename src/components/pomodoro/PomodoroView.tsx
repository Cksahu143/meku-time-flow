import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Settings, Coffee, Brain, Award, Sparkles } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PomodoroSettings } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AnimatedTimer, SpringCounter } from '@/components/effects/AnimatedDigits';
import { ConfettiExplosion, SparkleBurst } from '@/components/effects/ConfettiExplosion';

type SessionType = 'work' | 'shortBreak' | 'longBreak';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
};

// Floating ambient particles around the timer
function TimerParticles({ isRunning, color }: { isRunning: boolean; color: string }) {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i / 8) * 360,
    distance: 170 + Math.random() * 30,
    size: 3 + Math.random() * 4,
    duration: 3 + Math.random() * 4,
    delay: i * 0.4,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: color,
            left: '50%',
            top: '50%',
          }}
          animate={isRunning ? {
            x: [
              Math.cos((p.angle * Math.PI) / 180) * p.distance,
              Math.cos(((p.angle + 120) * Math.PI) / 180) * p.distance,
              Math.cos(((p.angle + 240) * Math.PI) / 180) * p.distance,
              Math.cos((p.angle * Math.PI) / 180) * p.distance,
            ],
            y: [
              Math.sin((p.angle * Math.PI) / 180) * p.distance,
              Math.sin(((p.angle + 120) * Math.PI) / 180) * p.distance,
              Math.sin(((p.angle + 240) * Math.PI) / 180) * p.distance,
              Math.sin((p.angle * Math.PI) / 180) * p.distance,
            ],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.8, 1.3, 0.8],
          } : {
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
            opacity: 0.2,
            scale: 1,
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// Pulsing ring effect when timer is active
function PulseRings({ isRunning }: { isRunning: boolean }) {
  if (!isRunning) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-primary-foreground/20"
          initial={{ scale: 1, opacity: 0.4 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.8,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

export function PomodoroView() {
  const [settings, setSettings] = useLocalStorage<PomodoroSettings>('pomodoroSettings', DEFAULT_SETTINGS);
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current === null) {
      audioRef.current = new Audio();
      audioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleSessionComplete();
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, timeLeft]);

  const handleSessionComplete = () => {
    setIsRunning(false);
    playNotificationSound();

    if (sessionType === 'work') {
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      // Trigger confetti!
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);

      if (newCompleted % settings.sessionsBeforeLongBreak === 0) {
        setSessionType('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        toast.success('Work Session Complete! 🎉', { description: 'Time for a long break. You earned it!' });
      } else {
        setSessionType('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        toast.success('Work Session Complete! ✨', { description: 'Take a short break.' });
      }
    } else {
      setSessionType('work');
      setTimeLeft(settings.workDuration * 60);
      toast.success('Break Complete! 💪', { description: 'Ready to focus again?' });
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.5);
    } catch {}
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 100);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    const duration = sessionType === 'work' ? settings.workDuration
      : sessionType === 'shortBreak' ? settings.shortBreakDuration
      : settings.longBreakDuration;
    setTimeLeft(duration * 60);
  };

  const changeSessionType = (type: SessionType) => {
    setIsRunning(false);
    setSessionType(type);
    const duration = type === 'work' ? settings.workDuration
      : type === 'shortBreak' ? settings.shortBreakDuration
      : settings.longBreakDuration;
    setTimeLeft(duration * 60);
  };

  const saveSettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
    resetTimer();
  };

  const getProgress = () => {
    const total = sessionType === 'work' ? settings.workDuration * 60
      : sessionType === 'shortBreak' ? settings.shortBreakDuration * 60
      : settings.longBreakDuration * 60;
    return ((total - timeLeft) / total) * 100;
  };

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'work': return Brain;
      case 'shortBreak': return Coffee;
      case 'longBreak': return Award;
    }
  };

  const SessionIcon = getSessionIcon();

  const sessionButtons: { type: SessionType; icon: typeof Brain; label: string }[] = [
    { type: 'work', icon: Brain, label: 'Focus' },
    { type: 'shortBreak', icon: Coffee, label: 'Short Break' },
    { type: 'longBreak', icon: Award, label: 'Long Break' },
  ];

  return (
    <motion.div
      className="min-h-full h-full p-4 md:p-6 lg:p-8"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Confetti on session complete */}
      <ConfettiExplosion trigger={showConfetti} particleCount={80} />

      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2.5 rounded-xl bg-primary/10"
            whileHover={{ scale: 1.1, rotate: 8 }}
            animate={isRunning ? { rotate: [0, 360] } : {}}
            transition={isRunning ? { duration: 8, repeat: Infinity, ease: 'linear' } : {}}
          >
            <Timer className="w-6 h-6 text-primary" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-foreground font-display">Pomodoro Timer</h2>
            <p className="text-sm text-muted-foreground">Stay focused and productive</p>
          </div>
        </div>
        <motion.button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-all"
          whileHover={{ scale: 1.1, rotate: 45 }}
          whileTap={{ scale: 0.9 }}
        >
          <Settings className="w-5 h-5" />
        </motion.button>
      </motion.div>

      <AnimatePresence mode="wait">
        {showSettings ? (
          <motion.div
            key="settings"
            className="card-premium rounded-2xl p-6 max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <h3 className="text-xl font-semibold mb-4 font-display">Timer Settings</h3>
            <div className="space-y-4">
              {[
                { label: 'Work Duration (minutes)', key: 'workDuration' as const, min: 1, max: 60 },
                { label: 'Short Break (minutes)', key: 'shortBreakDuration' as const, min: 1, max: 30 },
                { label: 'Long Break (minutes)', key: 'longBreakDuration' as const, min: 1, max: 60 },
                { label: 'Sessions Before Long Break', key: 'sessionsBeforeLongBreak' as const, min: 2, max: 10 },
              ].map((field, i) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <label className="block text-sm font-medium mb-2">{field.label}</label>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={tempSettings[field.key]}
                    onChange={(e) => setTempSettings({ ...tempSettings, [field.key]: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  />
                </motion.div>
              ))}
              <div className="flex gap-3 pt-4">
                <motion.button
                  onClick={saveSettings}
                  className="flex-1 px-4 py-2 rounded-lg bg-success text-success-foreground hover:opacity-90"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Save Settings
                </motion.button>
                <motion.button
                  onClick={() => { setShowSettings(false); setTempSettings(settings); }}
                  className="flex-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="timer"
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            {/* Session Type Selector with animated indicator */}
            <div className="flex gap-3 mb-8 justify-center flex-wrap">
              {sessionButtons.map((btn, i) => (
                <motion.button
                  key={btn.type}
                  onClick={() => changeSessionType(btn.type)}
                  className={cn(
                    'px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 relative overflow-hidden',
                    sessionType === btn.type
                      ? 'text-primary-foreground shadow-md'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {sessionType === btn.type && (
                    <motion.div
                      className={cn(
                        'absolute inset-0 rounded-lg',
                        btn.type === 'work' && 'bg-gradient-primary',
                        btn.type === 'shortBreak' && 'bg-gradient-accent',
                        btn.type === 'longBreak' && 'bg-gradient-success',
                      )}
                      layoutId="session-tab-bg"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <btn.icon className="w-5 h-5" />
                    {btn.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Timer Display */}
            <motion.div
              className="relative mb-8 flex justify-center"
              animate={isRunning ? { scale: [1, 1.01, 1] } : {}}
              transition={isRunning ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
            >
              <div
                className={cn(
                  'w-80 h-80 rounded-full flex items-center justify-center relative',
                  sessionType === 'work' && 'bg-gradient-primary',
                  sessionType === 'shortBreak' && 'bg-gradient-accent',
                  sessionType === 'longBreak' && 'bg-gradient-success',
                  'shadow-lg'
                )}
              >
                <PulseRings isRunning={isRunning} />
                <TimerParticles
                  isRunning={isRunning}
                  color={sessionType === 'work' ? 'hsl(var(--primary))' : sessionType === 'shortBreak' ? 'hsl(var(--accent))' : 'hsl(var(--success))'}
                />

                {/* SVG progress ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="160" cy="160" r="150" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                  <motion.circle
                    cx="160"
                    cy="160"
                    r="150"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 150}`}
                    strokeLinecap="round"
                    animate={{ strokeDashoffset: 2 * Math.PI * 150 * (1 - getProgress() / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>

                <div className="text-center z-10 relative">
                  <SparkleBurst trigger={showSparkle} size={80} />
                  <motion.div
                    animate={isRunning ? { y: [0, -4, 0] } : {}}
                    transition={isRunning ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                  >
                    <SessionIcon className="w-14 h-14 text-primary-foreground/90 mx-auto mb-3" />
                  </motion.div>
                  {/* Animated spring-physics timer digits */}
                  <AnimatedTimer timeInSeconds={timeLeft} className="text-6xl font-bold text-primary-foreground" />
                  <motion.div
                    className="text-primary-foreground/80 text-lg mt-2 capitalize"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={sessionType}
                    transition={{ duration: 0.3 }}
                  >
                    {sessionType.replace(/([A-Z])/g, ' $1').trim()}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              className="flex justify-center gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                onClick={toggleTimer}
                className={cn(
                  'px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 shadow-md',
                  sessionType === 'work' && 'bg-primary text-primary-foreground',
                  sessionType === 'shortBreak' && 'bg-accent text-accent-foreground',
                  sessionType === 'longBreak' && 'bg-success text-success-foreground'
                )}
                whileHover={{ scale: 1.06, y: -3 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isRunning ? 'pause' : 'play'}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    {isRunning ? <><Pause className="w-6 h-6" />Pause</> : <><Play className="w-6 h-6" />Start</>}
                  </motion.div>
                </AnimatePresence>
              </motion.button>
              <motion.button
                onClick={resetTimer}
                className="px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                whileHover={{ scale: 1.06, y: -3, rotate: -15 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <RotateCcw className="w-6 h-6" />
                Reset
              </motion.button>
            </motion.div>

            {/* Session Counter */}
            <motion.div
              className="card-premium rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className="w-6 h-6 text-primary" />
                  </motion.div>
                  <span className="text-lg font-medium">Completed Sessions</span>
                </div>
                <SpringCounter value={completedSessions} className="text-3xl font-bold text-primary" />
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress to long break</span>
                  <span>{completedSessions % settings.sessionsBeforeLongBreak}/{settings.sessionsBeforeLongBreak}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="bg-gradient-primary h-full rounded-full"
                    animate={{
                      width: `${((completedSessions % settings.sessionsBeforeLongBreak) / settings.sessionsBeforeLongBreak) * 100}%`,
                    }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
