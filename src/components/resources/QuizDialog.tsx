import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, XCircle, RotateCcw, Loader2, Trophy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
}

export const QuizDialog = ({ open, onOpenChange, resource, content }: QuizDialogProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (open && questions.length === 0) generate();
  }, [open]);

  const generate = async () => {
    setLoading(true);
    setQuestions([]);
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setShowResults(false);
    try {
      const { data, error } = await supabase.functions.invoke('ai-study-tools', {
        body: { type: 'quiz', content, title: resource.title, subject: resource.subject },
      });
      if (error) throw error;
      if (data?.questions) {
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
      } else throw new Error('No quiz generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate quiz');
    }
    setLoading(false);
  };

  const handleSelect = (optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    setAnswers(prev => { const n = [...prev]; n[currentQ] = optIdx; return n; });
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelected(null);
    } else {
      setShowResults(true);
    }
  };

  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const q = questions[currentQ];

  const handleClose = (v: boolean) => {
    if (!v) { setQuestions([]); setCurrentQ(0); setSelected(null); setAnswers([]); setShowResults(false); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quiz — {resource.title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating quiz...</p>
          </div>
        ) : showResults ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <Trophy className={`h-16 w-16 mx-auto ${score >= questions.length * 0.7 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              <h3 className="text-2xl font-bold">{score} / {questions.length}</h3>
              <p className="text-muted-foreground">
                {score >= questions.length * 0.9 ? 'Outstanding! 🎉' :
                 score >= questions.length * 0.7 ? 'Great job! 👏' :
                 score >= questions.length * 0.5 ? 'Good effort! 💪' : 'Keep studying! 📚'}
              </p>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {questions.map((qq, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${
                    answers[i] === qq.correctIndex ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'
                  }`}>
                    <p className="font-medium mb-1">{i + 1}. {qq.question}</p>
                    <p className="text-xs text-muted-foreground">Your answer: {qq.options[answers[i] ?? 0]} {answers[i] === qq.correctIndex ? '✓' : `✗ (Correct: ${qq.options[qq.correctIndex]})`}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-center">
              <Button onClick={generate}><RotateCcw className="h-4 w-4 mr-2" /> Try Again</Button>
            </div>
          </div>
        ) : q ? (
          <div className="space-y-4">
            <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5" />
            <p className="text-xs text-center text-muted-foreground">Question {currentQ + 1} of {questions.length}</p>

            <div className="py-2">
              <h3 className="text-lg font-semibold mb-4">{q.question}</h3>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correctIndex;
                  const isSelected = oi === selected;
                  const answered = selected !== null;
                  return (
                    <motion.button
                      key={oi}
                      whileHover={!answered ? { scale: 1.01 } : {}}
                      whileTap={!answered ? { scale: 0.99 } : {}}
                      onClick={() => handleSelect(oi)}
                      disabled={answered}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                        answered && isCorrect ? 'border-green-500 bg-green-500/10' :
                        answered && isSelected && !isCorrect ? 'border-destructive bg-destructive/10' :
                        answered ? 'opacity-60' :
                        'border-border hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      <span className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-medium shrink-0 ${
                        answered && isCorrect ? 'border-green-500 text-green-500' :
                        answered && isSelected ? 'border-destructive text-destructive' :
                        'border-border text-muted-foreground'
                      }`}>
                        {answered && isCorrect ? <CheckCircle2 className="h-4 w-4" /> :
                         answered && isSelected ? <XCircle className="h-4 w-4" /> :
                         String.fromCharCode(65 + oi)}
                      </span>
                      <span className="text-sm">{opt}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {selected !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <p className="text-sm"><strong>Explanation:</strong> {q.explanation}</p>
              </motion.div>
            )}

            <div className="flex justify-end">
              <Button onClick={nextQuestion} disabled={selected === null}>
                {currentQ < questions.length - 1 ? 'Next Question' : 'See Results'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3">
            <p className="text-muted-foreground">No quiz generated yet.</p>
            <Button onClick={generate}>Generate Quiz</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
