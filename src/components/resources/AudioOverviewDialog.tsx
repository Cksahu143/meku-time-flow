import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, RotateCcw, Volume2, Languages } from 'lucide-react';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';

interface AudioOverviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
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

export const AudioOverviewDialog = ({ open, onOpenChange, resource, content, gradeLevel }: AudioOverviewDialogProps) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lang, setLang] = useState('en');
  const [rate, setRate] = useState([1]);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      speechSynthesis.cancel();
      setPlaying(false);
      setPaused(false);
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
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
          gradeLevel: gradeLevel || 'Grade 8',
          language: VOICE_LANGUAGES.find(v => v.code === lang)?.label || 'English',
        }),
      });

      if (!res.ok) throw new Error('Failed to generate summary');

      // Handle streaming
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
      // Fallback: use the resource content directly
      const fallback = content.length > 500
        ? `Here is a summary of ${resource.title}: ${content.substring(0, 800)}...`
        : `Here is an overview of ${resource.title}: ${content || resource.description}`;
      setSummary(fallback);
    }
    setLoading(false);
  };

  const findVoice = useCallback(() => {
    // Try to find a voice matching the selected language
    const langCode = lang === 'or' ? 'od' : lang; // Odia code varies
    const match = availableVoices.find(v =>
      v.lang.startsWith(lang) || v.lang.startsWith(langCode)
    );
    return match || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
  }, [lang, availableVoices]);

  const speak = () => {
    if (paused) {
      speechSynthesis.resume();
      setPaused(false);
      setPlaying(true);
      startProgressTracker();
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(summary);
    const voice = findVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = rate[0];
    utterance.pitch = 1;

    utterance.onend = () => {
      setPlaying(false);
      setPaused(false);
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
    setPlaying(true);
    setPaused(false);
    startProgressTracker();
  };

  const startProgressTracker = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const estimatedDuration = (summary.length / 15) / rate[0]; // rough estimate
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const pct = Math.min((elapsed / estimatedDuration) * 100, 99);
      setProgress(pct);
    }, 200);
  };

  const pause = () => {
    speechSynthesis.pause();
    setPaused(true);
    setPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const regenerate = () => {
    stop();
    setSummary('');
    generateSummary();
  };

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
            Audio Overview — {resource.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Language & Speed controls */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Languages className="h-3 w-3" /> Language
              </label>
              <Select value={lang} onValueChange={v => { setLang(v); stop(); }}>
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
                onValueChange={v => { setRate(v); stop(); }}
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
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                Generating audio script...
              </div>
            ) : summary ? (
              <p className="whitespace-pre-wrap">{summary}</p>
            ) : (
              <p className="text-muted-foreground">No content to read.</p>
            )}
          </div>

          {/* Progress bar */}
          {(playing || paused || progress > 0) && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-200"
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
            <Button onClick={stop} size="sm" variant="outline" disabled={!playing && !paused} className="gap-2">
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
