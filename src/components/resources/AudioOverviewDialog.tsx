import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, RotateCcw, Volume2, Languages, Loader2 } from 'lucide-react';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';

interface AudioOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
  fileName?: string;
}

const VOICE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'or', label: 'Odia' },
  { code: 'sa', label: 'Sanskrit' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' },
];

export const AudioOverviewDialog = ({ open, onOpenChange, resource, content, gradeLevel, fileName }: AudioOverviewDialogProps) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lang, setLang] = useState('en');
  const [rate, setRate] = useState([1]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const isPlayingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Load voices
  useEffect(() => {
    const loadVoices = () => setAvailableVoices(speechSynthesis.getVoices());
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Generate summary when opened
  useEffect(() => {
    if (!open || summary) return;
    generateSummary();
  }, [open]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      stopPlayback();
    }
  }, [open]);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://gkkeysrfmgmxoypnjkdl.supabase.co`;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-study-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          tool: 'audio_overview',
          content,
          subject: resource.subject,
          title: resource.title,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          fileName: fileName || resource.file_name,
          gradeLevel: gradeLevel || 'Grade 8',
          language: VOICE_LANGUAGES.find(v => v.code === lang)?.label || 'English',
        }),
      });

      if (!res.ok) throw new Error('Failed to generate summary');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  text += delta;
                  setSummary(text);
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      console.error('Audio overview error:', err);
      const fallback = content.length > 500
        ? `Here is a summary of ${resource.title}: ${content.substring(0, 800)}...`
        : `Here is an overview of ${resource.title}: ${content || resource.description}`;
      setSummary(fallback);
    }
    setLoading(false);
  };

  const findVoice = useCallback(() => {
    const langCode = lang === 'or' ? 'od' : lang;
    const match = availableVoices.find(v =>
      v.lang.startsWith(lang) || v.lang.startsWith(langCode)
    );
    return match || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
  }, [lang, availableVoices]);

  // Split text into chunks to avoid Chrome's ~15s speech cutoff
  const splitIntoChunks = (text: string): string[] => {
    const sentences = text.match(/[^.!?।]+[.!?।]+[\s]*/g) || [text];
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > 200) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  };

  const speak = () => {
    if (paused) {
      speechSynthesis.resume();
      setPaused(false);
      setPlaying(true);
      isPlayingRef.current = true;
      return;
    }

    // Cancel any previous speech without delay
    speechSynthesis.cancel();

    const chunks = splitIntoChunks(summary);
    chunksRef.current = chunks;
    currentChunkRef.current = 0;
    setCurrentChunk(0);
    setTotalChunks(chunks.length);
    isPlayingRef.current = true;
    setPlaying(true);
    setPaused(false);
    setProgress(0);

    // Queue all chunks immediately — browser plays them seamlessly
    const voice = findVoice();
    
    // Use requestAnimationFrame to ensure cancel() has completed
    requestAnimationFrame(() => {
      chunks.forEach((text, index) => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) utterance.voice = voice;
        utterance.rate = rate[0];
        utterance.pitch = 1;

        utterance.onstart = () => {
          currentChunkRef.current = index;
          setCurrentChunk(index);
          setProgress((index / chunks.length) * 100);
        };

        utterance.onend = () => {
          if (!isPlayingRef.current) return;
          if (index === chunks.length - 1) {
            isPlayingRef.current = false;
            setPlaying(false);
            setPaused(false);
            setProgress(100);
          }
        };

        utterance.onerror = (e) => {
          if (e.error === 'interrupted' || e.error === 'canceled') return;
          console.warn('TTS chunk error:', e.error);
        };

        speechSynthesis.speak(utterance);
      });
    });
  };

  const pause = () => {
    speechSynthesis.pause();
    setPaused(true);
    setPlaying(false);
    isPlayingRef.current = false;
  };

  const stopPlayback = () => {
    speechSynthesis.cancel();
    isPlayingRef.current = false;
    setPlaying(false);
    setPaused(false);
    setProgress(0);
    setCurrentChunk(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const regenerate = () => {
    stopPlayback();
    setSummary('');
    generateSummary();
  };

  const estimatedMinutes = summary ? Math.max(1, Math.round((summary.length / 15 / 60) / rate[0])) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh] flex flex-col"
        onInteractOutside={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Audio Overview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Language & Speed controls */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Languages className="h-3 w-3" /> Language
              </label>
              <Select value={lang} onValueChange={v => { setLang(v); stopPlayback(); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_LANGUAGES.map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Speed: {rate[0]}x
              </label>
              <Slider
                value={rate}
                onValueChange={v => { setRate(v); stopPlayback(); }}
                min={0.5}
                max={2}
                step={0.25}
                className="mt-2"
              />
            </div>
          </div>

          {/* Summary text */}
          <div className="bg-muted/50 rounded-lg p-3 min-h-[120px] max-h-[240px] overflow-y-auto text-sm leading-relaxed">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Generating audio script{resource.url ? ' (fetching content from link...)' : ''}...</span>
              </div>
            ) : summary ? (
              <p className="whitespace-pre-wrap">{summary}</p>
            ) : (
              <p className="text-muted-foreground">No content to read.</p>
            )}
          </div>

          {/* Info bar */}
          {summary && !loading && (
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>~{estimatedMinutes} min at {rate[0]}x speed</span>
              {totalChunks > 0 && (playing || paused) && (
                <span>Part {Math.min(currentChunk + 1, totalChunks)}/{totalChunks}</span>
              )}
            </div>
          )}

          {/* Progress bar */}
          {(playing || paused || progress > 0) && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-3">
            {!playing ? (
              <Button onClick={speak} disabled={loading || !summary} size="sm" className="gap-2">
                <Play className="h-4 w-4" />
                {paused ? 'Resume' : 'Play'}
              </Button>
            ) : (
              <Button onClick={pause} size="sm" variant="secondary" className="gap-2">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            <Button onClick={stopPlayback} size="sm" variant="outline" disabled={!playing && !paused} className="gap-2">
              <Square className="h-4 w-4" /> Stop
            </Button>
            <Button onClick={regenerate} size="sm" variant="ghost" disabled={loading} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Regenerate
            </Button>
          </div>

          {!availableVoices.some(v => v.lang.startsWith(lang)) && lang !== 'en' && (
            <p className="text-xs text-amber-600 text-center">
              Your browser may not have a voice for this language. It will fall back to English.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
