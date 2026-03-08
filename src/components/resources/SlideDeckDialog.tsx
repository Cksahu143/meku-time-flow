import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ChevronLeft, ChevronRight, Maximize, Minimize, RotateCcw, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Slide { title: string; bullets: string[]; notes?: string; }

interface SlideDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
}

export const SlideDeckDialog = ({ open, onOpenChange, resource, content, gradeLevel }: SlideDeckDialogProps) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (open && slides.length === 0) generate();
  }, [open]);

  const generate = async () => {
    setLoading(true);
    setSlides([]);
    setCurrent(0);
    try {
      const { data, error } = await supabase.functions.invoke('ai-study-tools', {
        body: {
          type: 'slides',
          content,
          title: resource.title,
          subject: resource.subject,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          gradeLevel,
        },
      });
      if (error) throw error;
      if (data?.slides) setSlides(data.slides);
      else throw new Error('No slides generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate slides');
    }
    setLoading(false);
  };

  const slide = slides[current];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSlides([]); setCurrent(0); } onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh]" onInteractOutside={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            Slide Deck — {resource.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating revision slides...</p>
          </div>
        ) : slides.length > 0 ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              {/* Thumbnail strip */}
              <ScrollArea className="w-24 shrink-0 h-[400px]">
                <div className="space-y-2 pr-2">
                  {slides.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrent(i)}
                      className={`w-full text-left p-2 rounded-lg text-xs border transition-colors ${
                        i === current ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'
                      }`}
                    >
                      <p className="font-medium truncate">{i + 1}. {s.title}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* Main slide */}
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-xl border border-border bg-gradient-to-br from-card to-card/80 p-8 min-h-[360px] flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Slide {current + 1} of {slides.length}</span>
                      <span className="text-xs text-muted-foreground font-medium">{resource.subject}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-6 border-b border-primary/20 pb-3">
                      {slide.title}
                    </h2>
                    <ul className="space-y-3 flex-1">
                      {slide.bullets.map((bullet, bi) => (
                        <motion.li
                          key={bi}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: bi * 0.1 }}
                          className="flex items-start gap-3 text-foreground"
                        >
                          <span className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                          <span className="text-base">{bullet}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>

                {showNotes && slide.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Speaker Notes & Exam Tips</p>
                    <p className="text-sm text-foreground">{slide.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowNotes(n => !n)}>
                  {showNotes ? <Minimize className="h-4 w-4 mr-1" /> : <Maximize className="h-4 w-4 mr-1" />}
                  Notes
                </Button>
                <Button variant="ghost" size="sm" onClick={generate}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Regenerate
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrent(c => Math.min(slides.length - 1, c + 1))} disabled={current === slides.length - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3">
            <p className="text-muted-foreground">No slides generated yet.</p>
            <Button onClick={generate}>Generate Slide Deck</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
