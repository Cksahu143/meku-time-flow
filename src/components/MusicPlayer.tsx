import { useState, useRef, useEffect, useCallback } from 'react';
import { Music, Volume2, VolumeX, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';

const tracks = [
  { name: 'Lofi Study', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { name: 'Nature Sounds', url: 'https://cdn.pixabay.com/audio/2024/03/18/audio_59f255d39a.mp3' },
  { name: 'Calm Piano', url: 'https://cdn.pixabay.com/audio/2022/10/25/audio_3a6c2c0ac7.mp3' },
];

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create and manage audio element manually for better control
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = volume / 100;
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleError = () => {
      setIsPlaying(false);
      setLoading(false);
      toast.error('Failed to load track. Try another one.');
    };

    const handleCanPlay = () => setLoading(false);
    const handleWaiting = () => setLoading(true);
    const handlePlaying = () => setLoading(false);

    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    return () => {
      audio.pause();
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audioRef.current = null;
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Track progress
  useEffect(() => {
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (audio && audio.duration && isPlaying) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const playTrack = useCallback(async (index: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    setLoading(true);
    setCurrentTrack(index);
    audio.src = tracks[index].url;

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      // Autoplay may be blocked
      setIsPlaying(false);
      setLoading(false);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If no source set yet, load current track
      if (!audio.src || audio.src === '') {
        audio.src = tracks[currentTrack].url;
      }
      try {
        setLoading(true);
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        setLoading(false);
        toast.error('Playback blocked. Click a track to start.');
      }
    }
  }, [isPlaying, currentTrack]);

  const nextTrack = useCallback(() => {
    const next = (currentTrack + 1) % tracks.length;
    playTrack(next);
  }, [currentTrack, playTrack]);

  const prevTrack = useCallback(() => {
    const prev = (currentTrack - 1 + tracks.length) % tracks.length;
    playTrack(prev);
  }, [currentTrack, playTrack]);

  const toggleMute = () => setVolume(volume > 0 ? 0 : 50);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Music className="h-4 w-4" />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Study Music</h4>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevTrack}>
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay} disabled={loading}>
                {loading ? (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextTrack}>
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {isPlaying && <Progress value={progress} className="h-1" />}

          <div className="space-y-1.5">
            {tracks.map((track, index) => (
              <button
                key={index}
                onClick={() => playTrack(index)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentTrack === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {track.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
              {volume > 0 ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={(values) => setVolume(values[0])}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">{volume}%</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
