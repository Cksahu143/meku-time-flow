import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Settings, Coffee, Brain, Award } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { PomodoroSettings } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

type SessionType = 'work' | 'shortBreak' | 'longBreak';

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
};

export function PomodoroView() {
  const [settings, setSettings] = useLocalStorage<PomodoroSettings>(
    'pomodoroSettings',
    DEFAULT_SETTINGS
  );
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
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
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleSessionComplete = () => {
    setIsRunning(false);
    playNotificationSound();

    if (sessionType === 'work') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);

      if (newCompletedSessions % settings.sessionsBeforeLongBreak === 0) {
        setSessionType('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        toast({
          title: 'Work Session Complete!',
          description: 'Time for a long break. You earned it!',
        });
      } else {
        setSessionType('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        toast({
          title: 'Work Session Complete!',
          description: 'Take a short break.',
        });
      }
    } else {
      setSessionType('work');
      setTimeLeft(settings.workDuration * 60);
      toast({
        title: 'Break Complete!',
        description: 'Ready to focus again?',
      });
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      // Create a simple notification tone using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    const duration =
      sessionType === 'work'
        ? settings.workDuration
        : sessionType === 'shortBreak'
        ? settings.shortBreakDuration
        : settings.longBreakDuration;
    setTimeLeft(duration * 60);
  };

  const changeSessionType = (type: SessionType) => {
    setIsRunning(false);
    setSessionType(type);
    const duration =
      type === 'work'
        ? settings.workDuration
        : type === 'shortBreak'
        ? settings.shortBreakDuration
        : settings.longBreakDuration;
    setTimeLeft(duration * 60);
  };

  const saveSettings = () => {
    setSettings(tempSettings);
    setShowSettings(false);
    resetTimer();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalDuration =
      sessionType === 'work'
        ? settings.workDuration * 60
        : sessionType === 'shortBreak'
        ? settings.shortBreakDuration * 60
        : settings.longBreakDuration * 60;
    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  const getSessionColor = () => {
    switch (sessionType) {
      case 'work':
        return 'primary';
      case 'shortBreak':
        return 'accent';
      case 'longBreak':
        return 'success';
    }
  };

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'work':
        return Brain;
      case 'shortBreak':
        return Coffee;
      case 'longBreak':
        return Award;
    }
  };

  const SessionIcon = getSessionIcon();

  return (
    <div className="p-6 animate-slide-in-right">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Timer className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold text-foreground">Pomodoro Timer</h2>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all hover:scale-110"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {showSettings ? (
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg animate-scale-in max-w-md mx-auto">
          <h3 className="text-xl font-semibold mb-4">Timer Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Work Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={tempSettings.workDuration}
                onChange={(e) =>
                  setTempSettings({ ...tempSettings, workDuration: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Short Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={tempSettings.shortBreakDuration}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    shortBreakDuration: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Long Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={tempSettings.longBreakDuration}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    longBreakDuration: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sessions Before Long Break
              </label>
              <input
                type="number"
                min="2"
                max="10"
                value={tempSettings.sessionsBeforeLongBreak}
                onChange={(e) =>
                  setTempSettings({
                    ...tempSettings,
                    sessionsBeforeLongBreak: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={saveSettings}
                className="flex-1 px-4 py-2 rounded-lg bg-success text-success-foreground hover:opacity-90"
              >
                Save Settings
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setTempSettings(settings);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {/* Session Type Selector */}
          <div className="flex gap-3 mb-8 justify-center">
            <button
              onClick={() => changeSessionType('work')}
              className={cn(
                'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
                sessionType === 'work'
                  ? 'bg-gradient-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <Brain className="w-5 h-5" />
              Focus
            </button>
            <button
              onClick={() => changeSessionType('shortBreak')}
              className={cn(
                'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
                sessionType === 'shortBreak'
                  ? 'bg-gradient-accent text-accent-foreground shadow-accent'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <Coffee className="w-5 h-5" />
              Short Break
            </button>
            <button
              onClick={() => changeSessionType('longBreak')}
              className={cn(
                'px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2',
                sessionType === 'longBreak'
                  ? 'bg-gradient-success text-success-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <Award className="w-5 h-5" />
              Long Break
            </button>
          </div>

          {/* Timer Display */}
          <div className="relative mb-8">
            <div
              className={cn(
                'mx-auto w-80 h-80 rounded-full flex items-center justify-center relative',
                sessionType === 'work' && 'bg-gradient-primary',
                sessionType === 'shortBreak' && 'bg-gradient-accent',
                sessionType === 'longBreak' && 'bg-gradient-success',
                'shadow-lg'
              )}
            >
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="160"
                  cy="160"
                  r="150"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="160"
                  cy="160"
                  r="150"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 150}`}
                  strokeDashoffset={`${2 * Math.PI * 150 * (1 - getProgress() / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>

              <div className="text-center z-10">
                <SessionIcon className="w-16 h-16 text-white mx-auto mb-4" />
                <div className="text-6xl font-bold text-white">{formatTime(timeLeft)}</div>
                <div className="text-white/80 text-lg mt-2 capitalize">
                  {sessionType.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={toggleTimer}
              className={cn(
                'px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-3 transition-all hover:scale-105',
                sessionType === 'work' && 'bg-primary text-primary-foreground shadow-md',
                sessionType === 'shortBreak' && 'bg-accent text-accent-foreground shadow-accent',
                sessionType === 'longBreak' && 'bg-success text-success-foreground shadow-md'
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="w-6 h-6" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  Start
                </>
              )}
            </button>

            <button
              onClick={resetTimer}
              className="px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all hover:scale-105"
            >
              <RotateCcw className="w-6 h-6" />
              Reset
            </button>
          </div>

          {/* Session Counter */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-primary" />
                <span className="text-lg font-medium">Completed Sessions</span>
              </div>
              <div className="text-3xl font-bold text-primary">{completedSessions}</div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress to long break</span>
                <span>
                  {completedSessions % settings.sessionsBeforeLongBreak}/
                  {settings.sessionsBeforeLongBreak}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-primary h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${((completedSessions % settings.sessionsBeforeLongBreak) / settings.sessionsBeforeLongBreak) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
