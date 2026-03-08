import { useState } from 'react';
import { Music, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const playlists = [
  {
    name: 'Lofi Hip Hop',
    embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1235628588&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
  {
    name: 'Study Beats',
    embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/1012810706&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
  {
    name: 'Chill Piano',
    embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/272991585&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false',
  },
];

export function MusicPlayer() {
  const [activePlaylist, setActivePlaylist] = useState(0);
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

          {/* Playlist selector */}
          <div className="flex gap-1.5">
            {playlists.map((pl, i) => (
              <button
                key={i}
                onClick={() => {
                  setActivePlaylist(i);
                  setIsPlaying(true);
                }}
                className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${
                  activePlaylist === i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {pl.name}
              </button>
            ))}
          </div>

          {/* SoundCloud iframe */}
          <div className="rounded-lg overflow-hidden border border-border/30">
            <iframe
              width="100%"
              height="166"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={playlists[activePlaylist].embedUrl}
              onLoad={() => setIsPlaying(true)}
              title="SoundCloud Player"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
