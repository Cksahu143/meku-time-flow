import { useState, useRef, useEffect, useCallback } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const tracks = [
  { name: 'Whispering Canopy', src: '/audio/whispering-canopy.mp3', artist: 'Ambient' },
  { name: 'Whispers of the Una Corda', src: '/audio/whispers-una-corda.mp3', artist: 'Piano' },
  { name: 'Rainy Day Rhodes', src: '/audio/rainy-day-rhodes.mp3', artist: 'Chill' },
  { name: 'Lofi Study', src: '/audio/lofi-study.mp3', artist: 'Lofi' },
  { name: 'Calm Piano', src: '/audio/calm-piano.mp3', artist: 'Piano' },
  { name: 'Ambient Chill', src: '/audio/ambient-chill.mp3', artist: 'Ambient' },
];

export function MusicPlayer() {
  const [activeTrack, setActiveTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        handleNext();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update repeat/shuffle refs
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        handleNext();
      }
    };
    audio.removeEventListener('ended', onEnded);
    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeat, shuffle, activeTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = tracks[activeTrack].src;
    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [activeTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.src || audio.src === window.location.href) {
      audio.src = tracks[activeTrack].src;
    }
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = useCallback(() => {
    if (shuffle) {
      let next = Math.floor(Math.random() * tracks.length);
      while (next === activeTrack && tracks.length > 1) {
        next = Math.floor(Math.random() * tracks.length);
      }
      setActiveTrack(next);
    } else {
      setActiveTrack((prev) => (prev + 1) % tracks.length);
    }
  }, [shuffle, activeTrack]);

  const handlePrev = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setActiveTrack((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const selectTrack = (i: number) => {
    setActiveTrack(i);
    setIsPlaying(true);
    const audio = audioRef.current;
    if (audio) {
      audio.src = tracks[i].src;
      audio.play().catch(() => {});
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Music className="h-4 w-4" />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Study Music</h4>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${shuffle ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setShuffle(!shuffle)}
              >
                <Shuffle className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${repeat ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={() => setRepeat(!repeat)}
              >
                <Repeat className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Now playing */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm font-medium truncate">{tracks[activeTrack].name}</p>
            <p className="text-[11px] text-muted-foreground">{tracks[activeTrack].artist}</p>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.5}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setMuted(!muted)}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Slider
              value={[muted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={(v) => { setVolume(v[0] / 100); setMuted(false); }}
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Track list */}
        <div className="border-t border-border max-h-48 overflow-y-auto">
          {tracks.map((t, i) => (
            <button
              key={i}
              onClick={() => selectTrack(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 ${
                activeTrack === i ? 'bg-primary/10' : ''
              }`}
            >
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                {activeTrack === i && isPlaying ? (
                  <div className="flex items-end gap-[2px] h-3.5">
                    <span className="w-[3px] bg-primary rounded-full animate-pulse h-full" />
                    <span className="w-[3px] bg-primary rounded-full animate-pulse h-2/3" style={{ animationDelay: '0.15s' }} />
                    <span className="w-[3px] bg-primary rounded-full animate-pulse h-full" style={{ animationDelay: '0.3s' }} />
                  </div>
                ) : (
                  <Music className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-medium truncate ${activeTrack === i ? 'text-primary' : ''}`}>
                  {t.name}
                </p>
                <p className="text-[10px] text-muted-foreground">{t.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
