import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, RotateCcw, Volume2, Languages, Loader2, Mic2, Users } from 'lucide-react';
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

type AudioMode = 'solo' | 'podcast';

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
  const [mode, setMode] = useState<AudioMode>('podcast');
  const [activeHost, setActiveHost] = useState<'A' | 'B' | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => setAvailableVoices(speechSynthesis.getVoices());
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    if (!open || summary) return;
    generateSummary();
  }, [open]);

  useEffect(() => {
    if (!open) stopPlayback();
  }, [open]);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://gkkeysrfmgmxoypnjkdl.supabase.co`;
      const toolType = mode === 'podcast' ? 'podcast_overview' : 'audio_overview';

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-study-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          tool: toolType,
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

  // Find two distinct voices for podcast mode
  const findVoices = useCallback((): { voiceA: SpeechSynthesisVoice | null; voiceB: SpeechSynthesisVoice | null } => {
    const langCode = lang === 'or' ? 'od' : lang;
    const langVoices = availableVoices.filter(v => v.lang.startsWith(lang) || v.lang.startsWith(langCode));
    const enVoices = availableVoices.filter(v => v.lang.startsWith('en'));
    const pool = langVoices.length >= 2 ? langVoices : enVoices.length >= 2 ? enVoices : availableVoices;

    // Try to find male/female pair or at least two different voices
    const voiceA = pool.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('karen') || v.name.toLowerCase().includes('google')) || pool[0] || null;
    const voiceB = pool.find(v => v !== voiceA && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('james') || v.name.toLowerCase().includes('google'))) || pool.find(v => v !== voiceA) || voiceA;
    return { voiceA, voiceB };
  }, [lang, availableVoices]);

  const findSoloVoice = useCallback(() => {
    const langCode = lang === 'or' ? 'od' : lang;
    const match = availableVoices.find(v => v.lang.startsWith(lang) || v.lang.startsWith(langCode));
    return match || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
  }, [lang, availableVoices]);

  // Parse podcast script into segments with host labels
  const parsePodcastSegments = (text: string): Array<{ host: 'A' | 'B'; text: string }> => {
    const segments: Array<{ host: 'A' | 'B'; text: string }> = [];
    // Match patterns like [Host A], [Host B], **Host A:**, Host A:, etc.
    const regex = /(?:\[Host\s*(A|B)\]|\*\*Host\s*(A|B):\*\*|^Host\s*(A|B):)/gmi;
    let lastIndex = 0;
    let currentHost: 'A' | 'B' = 'A';
    let match;

    const rawSegments: Array<{ host: 'A' | 'B'; start: number }> = [];
    while ((match = regex.exec(text)) !== null) {
      const host = (match[1] || match[2] || match[3]).toUpperCase() as 'A' | 'B';
      rawSegments.push({ host, start: match.index + match[0].length });
    }

    if (rawSegments.length === 0) {
      // No host markers found — split by sentences, alternating hosts
      const sentences = text.match(/[^.!?।]+[.!?।]+[\s]*/g) || [text];
      let groupSize = 2;
      let host: 'A' | 'B' = 'A';
      for (let i = 0; i < sentences.length; i += groupSize) {
        const chunk = sentences.slice(i, i + groupSize).join('').trim();
        if (chunk) segments.push({ host, text: chunk });
        host = host === 'A' ? 'B' : 'A';
      }
      return segments;
    }

    // Extract text between host markers
    for (let i = 0; i < rawSegments.length; i++) {
      const start = rawSegments[i].start;
      const end = i + 1 < rawSegments.length ? text.lastIndexOf('[', rawSegments[i + 1].start) !== -1 ? text.lastIndexOf('[', rawSegments[i + 1].start) : rawSegments[i + 1].start - 20 : text.length;
      const segText = text.slice(start, end).replace(/^\s*[:—\-]\s*/, '').trim();
      if (segText) segments.push({ host: rawSegments[i].host, text: segText });
    }

    return segments.length > 0 ? segments : [{ host: 'A', text }];
  };

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

    speechSynthesis.cancel();
    isPlayingRef.current = true;
    setPlaying(true);
    setPaused(false);
    setProgress(0);

    if (mode === 'podcast') {
      speakPodcast();
    } else {
      speakSolo();
    }
  };

  const speakSolo = () => {
    const chunks = splitIntoChunks(summary);
    chunksRef.current = chunks;
    setTotalChunks(chunks.length);
    const voice = findSoloVoice();

    requestAnimationFrame(() => {
      chunks.forEach((text, index) => {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) utterance.voice = voice;
        utterance.rate = rate[0];
        utterance.pitch = 1;
        utterance.onstart = () => {
          setCurrentChunk(index);
          setProgress((index / chunks.length) * 100);
          setActiveHost(null);
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
        };
        speechSynthesis.speak(utterance);
      });
    });
  };

  const speakPodcast = () => {
    const segments = parsePodcastSegments(summary);
    const allChunks: Array<{ host: 'A' | 'B'; text: string }> = [];

    // Break each segment into smaller chunks for smooth playback
    segments.forEach(seg => {
      const chunks = splitIntoChunks(seg.text);
      chunks.forEach(c => allChunks.push({ host: seg.host, text: c }));
    });

    chunksRef.current = allChunks.map(c => c.text);
    setTotalChunks(allChunks.length);

    const { voiceA, voiceB } = findVoices();

    requestAnimationFrame(() => {
      allChunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk.text);
        const voice = chunk.host === 'A' ? voiceA : voiceB;
        if (voice) utterance.voice = voice;
        utterance.rate = rate[0];
        utterance.pitch = chunk.host === 'A' ? 1.05 : 0.92;

        utterance.onstart = () => {
          setCurrentChunk(index);
          setProgress((index / allChunks.length) * 100);
          setActiveHost(chunk.host);
        };
        utterance.onend = () => {
          if (!isPlayingRef.current) return;
          if (index === allChunks.length - 1) {
            isPlayingRef.current = false;
            setPlaying(false);
            setPaused(false);
            setProgress(100);
            setActiveHost(null);
          }
        };
        utterance.onerror = (e) => {
          if (e.error === 'interrupted' || e.error === 'canceled') return;
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
    setActiveHost(null);
  };

  const regenerate = () => {
    stopPlayback();
    setSummary('');
    generateSummary();
  };

  const switchMode = (newMode: AudioMode) => {
    stopPlayback();
    setSummary('');
    setMode(newMode);
    // Will regenerate on next effect cycle
    setTimeout(() => generateSummary(), 100);
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
            {mode === 'podcast' ? '🎙️ Deep Dive Podcast' : 'Audio Overview'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'podcast' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => mode !== 'podcast' && switchMode('podcast')}
            >
              <Users className="h-3.5 w-3.5" /> Two-Host Podcast
            </Button>
            <Button
              variant={mode === 'solo' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => mode !== 'solo' && switchMode('solo')}
            >
              <Mic2 className="h-3.5 w-3.5" /> Solo Narrator
            </Button>
          </div>

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

          {/* Host indicators for podcast mode */}
          {mode === 'podcast' && (playing || paused) && (
            <div className="flex gap-3 justify-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeHost === 'A' ? 'bg-primary text-primary-foreground scale-105 shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <div className={`h-2 w-2 rounded-full ${activeHost === 'A' ? 'bg-primary-foreground animate-pulse' : 'bg-muted-foreground/50'}`} />
                Host A
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeHost === 'B' ? 'bg-accent text-accent-foreground scale-105 shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <div className={`h-2 w-2 rounded-full ${activeHost === 'B' ? 'bg-accent-foreground animate-pulse' : 'bg-muted-foreground/50'}`} />
                Host B
              </div>
            </div>
          )}

          {/* Summary text */}
          <div className="bg-muted/50 rounded-lg p-3 min-h-[120px] max-h-[240px] overflow-y-auto text-sm leading-relaxed">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>
                  {mode === 'podcast'
                    ? 'Writing two-host podcast script...'
                    : `Generating audio script${resource.url ? ' (fetching content from link...)' : ''}...`}
                </span>
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
              <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
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
