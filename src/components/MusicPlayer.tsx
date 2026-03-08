import { useState } from 'react';
import { Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const tracks = [
  {
    name: 'Lofi Hip Hop',
    embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/1234567890&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
    // Using SoundCloud's genre-based search embed which is more reliable
    searchEmbed: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/search/sounds%3Fq%3Dlofi%2520hip%2520hop%2520beats&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true',
  },
  {
    name: 'Study Beats',
    searchEmbed: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/search/sounds%3Fq%3Dstudy%2520beats%2520chill&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true',
  },
  {
    name: 'Chill Piano',
    searchEmbed: 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/search/sounds%3Fq%3Dchill%2520piano%2520relaxing&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true',
  },
];

export function MusicPlayer() {
  const [activeTrack, setActiveTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Study Music</h4>
            <span className="text-[10px] text-muted-foreground">via SoundCloud</span>
          </div>

          <div className="flex gap-1.5">
            {tracks.map((t, i) => (
              <button
                key={i}
                onClick={() => { setActiveTrack(i); setIsPlaying(true); }}
                className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                  activeTrack === i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="rounded-lg overflow-hidden border border-border/30">
            <iframe
              width="100%"
              height="166"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={tracks[activeTrack].searchEmbed}
              onLoad={() => setIsPlaying(true)}
              title="SoundCloud Player"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
