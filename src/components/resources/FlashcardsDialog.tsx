import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ChevronLeft, ChevronRight, RotateCcw, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Flashcard { front: string; back: string; }

interface FlashcardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
  fileName?: string;
}

export const FlashcardsDialog = ({ open, onOpenChange, resource, content, gradeLevel }: FlashcardsDialogProps) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (open && cards.length === 0) generate();
  }, [open]);

  const generate = async () => {
    setLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    try {
      const { data, error } = await supabase.functions.invoke('ai-study-tools', {
        body: {
          type: 'flashcards',
          content,
          title: resource.title,
          subject: resource.subject,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          gradeLevel,
        },
      });
      if (error) throw error;
      if (data?.flashcards) setCards(data.flashcards);
      else throw new Error('No flashcards generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate flashcards');
    }
    setLoading(false);
  };

  const next = () => { setFlipped(false); setCurrentIndex(i => Math.min(i + 1, cards.length - 1)); };
  const prev = () => { setFlipped(false); setCurrentIndex(i => Math.max(i - 1, 0)); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setCards([]); setCurrentIndex(0); setFlipped(false); } onOpenChange(v); }}>
      <DialogContent className="max-w-xl" onInteractOutside={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Flashcards — {resource.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating board exam flashcards...</p>
          </div>
        ) : cards.length > 0 ? (
          <div className="space-y-4">
            <Progress value={((currentIndex + 1) / cards.length) * 100} className="h-1.5" />
            <p className="text-xs text-center text-muted-foreground">{currentIndex + 1} / {cards.length}</p>

            <div
              className="relative h-64 cursor-pointer perspective-1000"
              onClick={() => setFlipped(f => !f)}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentIndex}-${flipped}`}
                  initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`absolute inset-0 rounded-xl border p-6 flex flex-col items-center justify-center text-center ${
                    flipped
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-card border-border'
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-2">{flipped ? 'Answer' : 'Question'}</p>
                  <p className={`text-lg font-medium leading-relaxed ${flipped ? 'text-primary' : 'text-foreground'}`}>
                    {flipped ? cards[currentIndex].back : cards[currentIndex].front}
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">Click to flip</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={prev} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="ghost" size="sm" onClick={generate}>
                <RotateCcw className="h-4 w-4 mr-1" /> Regenerate
              </Button>
              <Button variant="outline" size="sm" onClick={next} disabled={currentIndex === cards.length - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3">
            <p className="text-muted-foreground">No flashcards generated yet.</p>
            <Button onClick={generate}>Generate Flashcards</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
