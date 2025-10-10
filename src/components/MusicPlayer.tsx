import { useState, useRef, useEffect } from 'react';
import { Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const tracks = [
  { name: 'Lofi Study', url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { name: 'Nature Sounds', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_4deafc7343.mp3' },
  { name: 'Calm Piano', url: 'https://cdn.pixabay.com/audio/2023/11/25/audio_6644130e1d.mp3' },
];

export function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 50);
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative"
          >
            <Music className="h-4 w-4" />
            {isPlaying && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Study Music</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              {tracks.map((track, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentTrack(index);
                    if (isPlaying && audioRef.current) {
                      audioRef.current.play();
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
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
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
              >
                {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Slider
                value={[volume]}
                onValueChange={(values) => setVolume(values[0])}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-10 text-right">
                {volume}%
              </span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <audio
        ref={audioRef}
        src={tracks[currentTrack].url}
        loop
        onEnded={() => setIsPlaying(false)}
      />
    </>
  );
}
