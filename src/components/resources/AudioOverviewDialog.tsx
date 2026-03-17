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

// ─── Voice scoring system for natural-sounding voice selection ──────────────
// Rank voices by how natural they sound, preferring premium/enhanced voices

const FEMALE_INDICATORS = [
  'female', 'woman', 'samantha', 'karen', 'victoria', 'fiona', 'moira',
  'tessa', 'alex', 'allison', 'ava', 'susan', 'zira', 'hazel', 'linda',
  'catherine', 'kate', 'serena', 'veena', 'lekha', 'meijia', 'tingting',
  'yuna', 'kyoko', 'ellen', 'nora', 'sara', 'monica', 'paulina', 'joana',
  'luciana', 'helena', 'amelie', 'alice', 'anna', 'milena', 'carmit',
  'damayanti', 'kanya', 'lana', 'laura', 'lesya', 'linh', 'mariska',
  'miren', 'montserrat', 'reed', 'rishi', 'sandy', 'shelley', 'sinji',
  'satu', 'sin-ji', 'yelda', 'zosia',
];

const MALE_INDICATORS = [
  'male', 'man', 'daniel', 'james', 'david', 'tom', 'thomas', 'aaron',
  'albert', 'arthur', 'bruce', 'fred', 'junior', 'jorge', 'juan', 'diego',
  'luca', 'oliver', 'oskar', 'ralph', 'eddy', 'evan', 'grandpa', 'grandma',
  'lee', 'gordon', 'mark', 'neel', 'rishi', 'trinoids', 'rocko', 'reed',
];

// Premium/natural voice keywords (score higher)
const PREMIUM_INDICATORS = [
  'premium', 'enhanced', 'natural', 'neural', 'wavenet', 'online',
  'compact', 'eloquence',
];

function scoreVoice(voice: SpeechSynthesisVoice, preferGender: 'female' | 'male' | 'any'): number {
  const name = voice.name.toLowerCase();
  let score = 0;

  // Prefer non-local / premium voices
  if (!voice.localService) score += 20;
  for (const kw of PREMIUM_INDICATORS) {
    if (name.includes(kw)) { score += 15; break; }
  }

  // Gender preference
  if (preferGender === 'female') {
    if (FEMALE_INDICATORS.some(k => name.includes(k))) score += 30;
    if (MALE_INDICATORS.some(k => name.includes(k))) score -= 20;
  } else if (preferGender === 'male') {
    if (MALE_INDICATORS.some(k => name.includes(k))) score += 30;
    if (FEMALE_INDICATORS.some(k => name.includes(k))) score -= 20;
  }

  // Prefer Google / Microsoft voices (generally higher quality)
  if (name.includes('google')) score += 10;
  if (name.includes('microsoft')) score += 8;

  return score;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  gender: 'female' | 'male' | 'any',
  exclude?: SpeechSynthesisVoice | null,
): SpeechSynthesisVoice | null {
  const langCode = lang === 'or' ? 'od' : lang;
  const langVoices = voices.filter(v => v.lang.startsWith(lang) || v.lang.startsWith(langCode));
  const pool = langVoices.length > 0 ? langVoices : voices.filter(v => v.lang.startsWith('en'));

  const candidates = exclude ? pool.filter(v => v !== exclude) : pool;
  if (candidates.length === 0) return pool[0] || voices[0] || null;

  candidates.sort((a, b) => scoreVoice(b, gender) - scoreVoice(a, gender));
  return candidates[0];
}

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
  const utteranceQueue = useRef<SpeechSynthesisUtterance[]>([]);
  const currentUtteranceIndex = useRef(0);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      if (v.length > 0) setAvailableVoices(v);
    };
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

  // Parse podcast script into segments with host labels
  const parsePodcastSegments = (text: string): Array<{ host: 'A' | 'B'; text: string }> => {
    const segments: Array<{ host: 'A' | 'B'; text: string }> = [];
    const regex = /(?:\[Host\s*(A|B)\]|\*\*Host\s*(A|B):\*\*|^Host\s*(A|B):)/gmi;
    const rawSegments: Array<{ host: 'A' | 'B'; start: number; matchEnd: number }> = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const host = (match[1] || match[2] || match[3]).toUpperCase() as 'A' | 'B';
      rawSegments.push({ host, start: match.index, matchEnd: match.index + match[0].length });
    }

    if (rawSegments.length === 0) {
      // No host markers — alternate by sentence pairs
      const sentences = text.match(/[^.!?।]+[.!?।]+[\s]*/g) || [text];
      let host: 'A' | 'B' = 'A';
      for (let i = 0; i < sentences.length; i += 2) {
        const chunk = sentences.slice(i, i + 2).join('').trim();
        if (chunk) segments.push({ host, text: chunk });
        host = host === 'A' ? 'B' : 'A';
      }
      return segments;
    }

    for (let i = 0; i < rawSegments.length; i++) {
      const start = rawSegments[i].matchEnd;
      const end = i + 1 < rawSegments.length ? rawSegments[i + 1].start : text.length;
      const segText = text.slice(start, end).replace(/^\s*[:—\-]\s*/, '').trim();
      if (segText) segments.push({ host: rawSegments[i].host, text: segText });
    }

    return segments.length > 0 ? segments : [{ host: 'A', text }];
  };

  // Split text into natural sentence-based chunks (not too long, not too short)
  const splitIntoSentences = (text: string): string[] => {
    // Split on sentence boundaries, keeping the punctuation
    const raw = text.match(/[^.!?।]+[.!?।]+[\s]*/g) || [text];
    // Merge very short sentences together for smoother speech
    const merged: string[] = [];
    let current = '';
    for (const s of raw) {
      if ((current + s).length > 250) {
        if (current) merged.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) merged.push(current.trim());
    return merged;
  };

  // ─── Sequential utterance playback (one at a time for better quality) ─────
  const playNextUtterance = useCallback(() => {
    if (!isPlayingRef.current) return;
    const idx = currentUtteranceIndex.current;
    const queue = utteranceQueue.current;
    if (idx >= queue.length) {
      // Finished
      isPlayingRef.current = false;
      setPlaying(false);
      setPaused(false);
      setProgress(100);
      setActiveHost(null);
      return;
    }
    speechSynthesis.speak(queue[idx]);
  }, []);

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
    currentUtteranceIndex.current = 0;

    if (mode === 'podcast') {
      buildPodcastQueue();
    } else {
      buildSoloQueue();
    }

    // Start playing first utterance
    playNextUtterance();
  };

  const buildSoloQueue = () => {
    const sentences = splitIntoSentences(summary);
    const voice = pickBestVoice(availableVoices, lang, 'female');
    const queue: SpeechSynthesisUtterance[] = [];

    sentences.forEach((text, index) => {
      const utt = new SpeechSynthesisUtterance(text);
      if (voice) utt.voice = voice;
      utt.rate = Math.max(0.8, rate[0] * 0.95); // Slightly slower for naturalness
      utt.pitch = 1.0;
      utt.volume = 1.0;

      utt.onstart = () => {
        setCurrentChunk(index);
        setProgress((index / sentences.length) * 100);
        setActiveHost(null);
      };
      utt.onend = () => {
        if (!isPlayingRef.current) return;
        currentUtteranceIndex.current = index + 1;
        // Small pause between sentences for naturalness
        setTimeout(() => playNextUtterance(), 120);
      };
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        // Try next
        currentUtteranceIndex.current = index + 1;
        playNextUtterance();
      };

      queue.push(utt);
    });

    utteranceQueue.current = queue;
    setTotalChunks(sentences.length);
  };

  const buildPodcastQueue = () => {
    const segments = parsePodcastSegments(summary);
    const allChunks: Array<{ host: 'A' | 'B'; text: string }> = [];

    segments.forEach(seg => {
      const sentences = splitIntoSentences(seg.text);
      sentences.forEach(s => allChunks.push({ host: seg.host, text: s }));
    });

    // Pick distinct male + female voices
    const femaleVoice = pickBestVoice(availableVoices, lang, 'female');
    const maleVoice = pickBestVoice(availableVoices, lang, 'male', femaleVoice);

    const queue: SpeechSynthesisUtterance[] = [];

    allChunks.forEach((chunk, index) => {
      const utt = new SpeechSynthesisUtterance(chunk.text);
      const voice = chunk.host === 'A' ? femaleVoice : maleVoice;
      if (voice) utt.voice = voice;

      // Distinct but natural pitch differentiation
      if (chunk.host === 'A') {
        utt.pitch = 1.08; // Slightly higher for female host
        utt.rate = Math.max(0.8, rate[0] * 0.93);
      } else {
        utt.pitch = 0.88; // Noticeably lower for male host
        utt.rate = Math.max(0.8, rate[0] * 0.97);
      }
      utt.volume = 1.0;

      utt.onstart = () => {
        setCurrentChunk(index);
        setProgress((index / allChunks.length) * 100);
        setActiveHost(chunk.host);
      };
      utt.onend = () => {
        if (!isPlayingRef.current) return;
        currentUtteranceIndex.current = index + 1;

        // Determine pause duration: longer between host switches, shorter within same host
        const nextChunk = allChunks[index + 1];
        const isSwitching = nextChunk && nextChunk.host !== chunk.host;
        const pauseMs = isSwitching ? 350 : 100;

        setTimeout(() => playNextUtterance(), pauseMs);
      };
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        currentUtteranceIndex.current = index + 1;
        playNextUtterance();
      };

      queue.push(utt);
    });

    utteranceQueue.current = queue;
    setTotalChunks(allChunks.length);
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
    utteranceQueue.current = [];
    currentUtteranceIndex.current = 0;
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
    setTimeout(() => generateSummary(), 100);
  };

  const estimatedMinutes = summary ? Math.max(1, Math.round((summary.length / 15 / 60) / rate[0])) : 0;

  // Show which voices are selected for debugging / user info
  const femaleVoice = pickBestVoice(availableVoices, lang, 'female');
  const maleVoice = pickBestVoice(availableVoices, lang, 'male', femaleVoice);

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

          {/* Voice info badge */}
          {mode === 'podcast' && femaleVoice && maleVoice && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] gap-1">
                🎙️ Host A: {femaleVoice.name.split(' ').slice(0, 2).join(' ')}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                🎤 Host B: {maleVoice.name.split(' ').slice(0, 2).join(' ')}
              </Badge>
            </div>
          )}

          {/* Host indicators for podcast mode */}
          {mode === 'podcast' && (playing || paused) && (
            <div className="flex gap-3 justify-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeHost === 'A' ? 'bg-primary text-primary-foreground scale-105 shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <div className={`h-2 w-2 rounded-full ${activeHost === 'A' ? 'bg-primary-foreground animate-pulse' : 'bg-muted-foreground/50'}`} />
                Host A (♀)
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeHost === 'B' ? 'bg-accent text-accent-foreground scale-105 shadow-md' : 'bg-muted text-muted-foreground'}`}>
                <div className={`h-2 w-2 rounded-full ${activeHost === 'B' ? 'bg-accent-foreground animate-pulse' : 'bg-muted-foreground/50'}`} />
                Host B (♂)
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
