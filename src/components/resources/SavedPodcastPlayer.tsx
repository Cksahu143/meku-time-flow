import { useState, useRef, useCallback } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SavedAIResult } from '@/hooks/useSavedAIResults';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedResult: SavedAIResult;
}

export const SavedPodcastPlayer = ({ open, onOpenChange, savedResult }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState([1]);
  const [progress, setProgress] = useState(0);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const currentIndexRef = useRef(0);
  const totalRef = useRef(0);

  const text = savedResult.ai_output?.text || '';
  const lang = savedResult.ai_output?.language || 'en';

  const splitIntoChunks = useCallback((t: string): string[] => {
    const sentences = t.match(/[^.!?]+[.!?]+/g) || [t];
    const chunks: string[] = [];
    let current = '';
    for (const s of sentences) {
      if ((current + s).length > 300 && current) {
        chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }, []);

  const startPlayback = useCallback(() => {
    window.speechSynthesis.cancel();
    const chunks = splitIntoChunks(text);
    totalRef.current = chunks.length;
    currentIndexRef.current = 0;

    const utts = chunks.map((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = lang;
      u.rate = rate[0];
      u.onstart = () => {
        currentIndexRef.current = i;
        setProgress(Math.round(((i + 1) / chunks.length) * 100));
      };
      u.onend = () => {
        if (i === chunks.length - 1) {
          setPlaying(false);
          setPaused(false);
          setProgress(100);
        }
      };
      return u;
    });

    utterancesRef.current = utts;
    utts.forEach(u => window.speechSynthesis.speak(u));
    setPlaying(true);
    setPaused(false);
  }, [text, lang, rate, splitIntoChunks]);

  const togglePause = () => {
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
  };

  const handleClose = (v: boolean) => {
    if (!v) stop();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            {savedResult.resource_title || 'Saved Podcast'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 py-3 border-b border-border/40">
          {!playing ? (
            <Button onClick={startPlayback} size="sm" className="gap-1.5">
              <Play className="h-4 w-4" /> Play
            </Button>
          ) : (
            <>
              <Button onClick={togglePause} size="sm" variant="outline" className="gap-1.5">
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {paused ? 'Resume' : 'Pause'}
              </Button>
              <Button onClick={stop} size="sm" variant="ghost" className="gap-1.5">
                <Square className="h-4 w-4" /> Stop
              </Button>
            </>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Speed</span>
            <Slider value={rate} onValueChange={setRate} min={0.5} max={2} step={0.25} className="w-24" />
            <span className="text-xs text-muted-foreground w-8">{rate[0]}x</span>
          </div>
        </div>

        {playing && (
          <div className="flex items-center gap-2 py-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">{savedResult.tool_type === 'podcast' ? 'Podcast' : 'Audio Overview'}</Badge>
          <Badge variant="secondary">{savedResult.subject}</Badge>
          {lang && <Badge variant="secondary">{lang.toUpperCase()}</Badge>}
        </div>

        <ScrollArea className="flex-1 mt-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
