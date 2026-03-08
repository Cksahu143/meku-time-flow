import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, XCircle, RotateCcw, Loader2, Trophy, Mic, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface VivaQuestion {
  question: string;
  expectedAnswer: string;
  followUp: string;
  examinerTip: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

type QuizMode = 'quiz' | 'viva';

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
  fileName?: string;
}

export const QuizDialog = ({ open, onOpenChange, resource, content, gradeLevel, fileName }: QuizDialogProps) => {
  const [mode, setMode] = useState<QuizMode>('quiz');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [vivaQuestions, setVivaQuestions] = useState<VivaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  // Viva state
  const [vivaAnswer, setVivaAnswer] = useState('');
  const [vivaRevealed, setVivaRevealed] = useState(false);
  const [vivaAnswers, setVivaAnswers] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (open) {
      setStarted(false);
      setQuestions([]);
      setVivaQuestions([]);
      setCurrentQ(0);
      setSelected(null);
      setAnswers([]);
      setShowResults(false);
      setVivaAnswer('');
      setVivaRevealed(false);
      setVivaAnswers([]);
    }
  }, [open]);

  const generate = async () => {
    setLoading(true);
    setQuestions([]);
    setVivaQuestions([]);
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setShowResults(false);
    setVivaAnswer('');
    setVivaRevealed(false);
    setVivaAnswers([]);
    setStarted(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-study-tools', {
        body: {
          type: mode === 'quiz' ? 'quiz' : 'viva',
          content,
          title: resource.title,
          subject: resource.subject,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          fileName: fileName || resource.file_name,
          gradeLevel,
        },
      });
      if (error) throw error;
      if (mode === 'quiz' && data?.questions) {
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(null));
      } else if (mode === 'viva' && data?.questions) {
        setVivaQuestions(data.questions);
        setVivaAnswers(new Array(data.questions.length).fill(''));
      } else throw new Error('No content generated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate');
      setStarted(false);
    }
    setLoading(false);
  };

  // Quiz handlers
  const handleSelect = (optIdx: number) => {
    if (selected !== null) return;
    setSelected(optIdx);
    setAnswers(prev => { const n = [...prev]; n[currentQ] = optIdx; return n; });
  };

  const nextQuestion = () => {
    if (mode === 'quiz') {
      if (currentQ < questions.length - 1) {
        setCurrentQ(c => c + 1);
        setSelected(null);
      } else {
        setShowResults(true);
      }
    } else {
      setVivaAnswers(prev => { const n = [...prev]; n[currentQ] = vivaAnswer; return n; });
      if (currentQ < vivaQuestions.length - 1) {
        setCurrentQ(c => c + 1);
        setVivaAnswer('');
        setVivaRevealed(false);
      } else {
        setShowResults(true);
      }
    }
  };

  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const q = questions[currentQ];
  const vq = vivaQuestions[currentQ];

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (d === 'medium') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setQuestions([]); setVivaQuestions([]); setCurrentQ(0); setSelected(null);
      setAnswers([]); setShowResults(false); setStarted(false);
      setVivaAnswer(''); setVivaRevealed(false); setVivaAnswers([]);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]" onInteractOutside={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()} onEscapeKeyDown={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {mode === 'quiz' ? 'Board Exam Quiz' : 'Mock Viva Voce'} — {resource.title}
          </DialogTitle>
        </DialogHeader>

        {!started ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">Choose your exam preparation mode</p>
            </div>
            <Tabs value={mode} onValueChange={v => setMode(v as QuizMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quiz" className="gap-2">
                  <BookOpen className="h-4 w-4" /> Normal Quiz
                </TabsTrigger>
                <TabsTrigger value="viva" className="gap-2">
                  <Mic className="h-4 w-4" /> Mock Viva
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              {mode === 'quiz' ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">📝 Board Exam Quiz</h4>
                  <p className="text-sm text-muted-foreground">
                    10-12 challenging MCQs at board exam difficulty. Tests conceptual understanding, application, and analytical skills. Includes tricky distractors and detailed explanations.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">🎤 Mock Viva Voce</h4>
                  <p className="text-sm text-muted-foreground">
                    Simulates a real oral examination. Open-ended questions with progressive difficulty. Type your answer, then reveal what the examiner expects. Includes follow-up questions and examiner tips.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <Button onClick={generate} size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" /> Start {mode === 'quiz' ? 'Quiz' : 'Viva'}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {mode === 'quiz' ? 'Generating board exam questions...' : 'Preparing viva questions...'}
            </p>
          </div>
        ) : showResults ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-3">
              <Trophy className={`h-16 w-16 mx-auto ${
                mode === 'quiz'
                  ? (score >= questions.length * 0.7 ? 'text-yellow-500' : 'text-muted-foreground')
                  : 'text-yellow-500'
              }`} />
              {mode === 'quiz' ? (
                <>
                  <h3 className="text-2xl font-bold">{score} / {questions.length}</h3>
                  <p className="text-muted-foreground">
                    {score >= questions.length * 0.9 ? 'Outstanding! You\'re board exam ready! 🎉' :
                     score >= questions.length * 0.7 ? 'Great job! Almost there! 👏' :
                     score >= questions.length * 0.5 ? 'Good effort! Review the explanations below 💪' : 'Keep studying! Review each explanation carefully 📚'}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold">Viva Complete!</h3>
                  <p className="text-muted-foreground">Review your answers against the expected responses below</p>
                </>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {mode === 'quiz' ? questions.map((qq, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${
                    answers[i] === qq.correctIndex ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'
                  }`}>
                    <p className="font-medium mb-1">{i + 1}. {qq.question}</p>
                    <p className="text-xs text-muted-foreground">Your answer: {qq.options[answers[i] ?? 0]} {answers[i] === qq.correctIndex ? '✓' : `✗ (Correct: ${qq.options[qq.correctIndex]})`}</p>
                    <p className="text-xs text-muted-foreground mt-1 italic">{qq.explanation}</p>
                  </div>
                )) : vivaQuestions.map((vq, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/30 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={difficultyColor(vq.difficulty)}>{vq.difficulty}</Badge>
                      <p className="font-medium">{i + 1}. {vq.question}</p>
                    </div>
                    {vivaAnswers[i] && (
                      <div className="p-2 rounded bg-primary/5 border border-primary/20">
                        <p className="text-xs font-medium text-primary mb-1">Your Answer:</p>
                        <p className="text-xs">{vivaAnswers[i]}</p>
                      </div>
                    )}
                    <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
                      <p className="text-xs font-medium text-green-600 mb-1">Expected Answer:</p>
                      <p className="text-xs">{vq.expectedAnswer}</p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">💡 Examiner tip: {vq.examinerTip}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-center gap-2">
              <Button onClick={() => { setStarted(false); setShowResults(false); }}>
                Change Mode
              </Button>
              <Button onClick={generate} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </div>
          </div>
        ) : mode === 'quiz' && q ? (
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
        ) : mode === 'viva' && vq ? (
          <div className="space-y-4">
            <Progress value={((currentQ + 1) / vivaQuestions.length) * 100} className="h-1.5" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Question {currentQ + 1} of {vivaQuestions.length}</p>
              <Badge variant="outline" className={difficultyColor(vq.difficulty)}>{vq.difficulty}</Badge>
            </div>

            <div className="py-2 space-y-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2 font-medium">🎤 Examiner asks:</p>
                <h3 className="text-lg font-semibold">{vq.question}</h3>
              </div>

              <Textarea
                value={vivaAnswer}
                onChange={e => setVivaAnswer(e.target.value)}
                placeholder="Type your answer as you would say it in a viva..."
                className="min-h-[100px] resize-none"
                disabled={vivaRevealed}
              />

              {!vivaRevealed ? (
                <Button onClick={() => setVivaRevealed(true)} variant="outline" className="w-full" disabled={!vivaAnswer.trim()}>
                  Reveal Expected Answer
                </Button>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <p className="text-xs font-medium text-green-600 mb-1">✅ Expected Answer:</p>
                      <p className="text-sm">{vq.expectedAnswer}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">🔄 Follow-up Question:</p>
                      <p className="text-sm">{vq.followUp}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">💡 Examiner Tip:</p>
                      <p className="text-sm">{vq.examinerTip}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={nextQuestion} disabled={!vivaRevealed}>
                {currentQ < vivaQuestions.length - 1 ? 'Next Question' : 'See Results'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 gap-3">
            <p className="text-muted-foreground">No content generated yet.</p>
            <Button onClick={generate}>Generate</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
