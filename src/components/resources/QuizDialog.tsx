import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, XCircle, RotateCcw, Loader2, Trophy, Mic, BookOpen, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { DbResource } from '@/hooks/useResources';
import { SaveResultButton } from './SaveResultButton';
import { MarkdownRenderer } from './MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Enhanced question types
interface MCQQuestion { type: 'mcq'; question: string; options: string[]; correctIndex: number; explanation: string; }
interface TrueFalseQuestion { type: 'true_false'; question: string; answer: boolean; explanation: string; }
interface ShortAnswerQuestion { type: 'short_answer'; question: string; expectedAnswer: string; explanation: string; }
interface FillBlankQuestion { type: 'fill_blank'; question: string; answer: string; explanation: string; }
interface EssayQuestion { type: 'essay'; question: string; rubric: string[]; sampleAnswer: string; explanation: string; }
interface MatchQuestion { type: 'match'; question: string; leftColumn: string[]; rightColumn: string[]; correctPairs: number[]; explanation: string; }

type QuizQuestion = MCQQuestion | TrueFalseQuestion | ShortAnswerQuestion | FillBlankQuestion | EssayQuestion | MatchQuestion;

interface VivaQuestion {
  question: string;
  expectedAnswer: string;
  followUp: string;
  examinerTip: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

type QuizMode = 'quiz' | 'viva';

const QUESTION_TYPES = [
  { id: 'mcq', label: 'Multiple Choice (MCQ)', default: true },
  { id: 'true_false', label: 'True / False', default: true },
  { id: 'short_answer', label: 'Short Answer', default: false },
  { id: 'fill_blank', label: 'Fill in the Blank', default: false },
  { id: 'essay', label: 'Long Answer / Essay', default: false },
  { id: 'match', label: 'Match the Following', default: false },
];

interface QuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
  fileName?: string;
  availableChapters?: string[];
}

export const QuizDialog = ({ open, onOpenChange, resource, content, gradeLevel, fileName, availableChapters }: QuizDialogProps) => {
  const [mode, setMode] = useState<QuizMode>('quiz');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [vivaQuestions, setVivaQuestions] = useState<VivaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [started, setStarted] = useState(false);

  // Config
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['mcq', 'true_false']);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [customChapter, setCustomChapter] = useState('');

  // Parse chapters from resource content for books
  const chapters = availableChapters || (() => {
    try {
      if (resource.content) {
        const parsed = JSON.parse(resource.content);
        if (parsed.chapters && Array.isArray(parsed.chapters)) return parsed.chapters as string[];
      }
    } catch {}
    return [];
  })();

  // Viva state
  const [vivaAnswer, setVivaAnswer] = useState('');
  const [vivaRevealed, setVivaRevealed] = useState(false);
  const [vivaAnswers, setVivaAnswers] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setStarted(false);
      setQuestions([]);
      setVivaQuestions([]);
      setCurrentQ(0);
      setAnswers({});
      setShowResults(false);
      setVivaAnswer('');
      setVivaRevealed(false);
      setVivaAnswers([]);
    }
  }, [open]);

  const toggleType = (id: string) => {
    setSelectedTypes(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    setLoading(true);
    setQuestions([]);
    setVivaQuestions([]);
    setCurrentQ(0);
    setAnswers({});
    setShowResults(false);
    setVivaAnswer('');
    setVivaRevealed(false);
    setVivaAnswers([]);
    setStarted(true);
    try {
      // Build content with chapter focus
      let quizContent = content;
      if (selectedChapters.length > 0) {
        quizContent = `${content}\n\nFOCUS ON THESE SPECIFIC CHAPTERS/SECTIONS:\n${selectedChapters.join('\n')}\n\nGenerate questions ONLY from these chapters.`;
      }

      const { data, error } = await supabase.functions.invoke('ai-study-tools', {
        body: {
          type: mode === 'quiz' ? 'enhanced_quiz' : 'viva',
          content: quizContent,
          title: resource.title,
          subject: resource.subject,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          fileName: fileName || resource.file_name,
          gradeLevel,
          questionTypes: selectedTypes,
          questionCount,
          difficulty,
          chapters: selectedChapters.length > 0 ? selectedChapters : undefined,
        },
      });
      if (error) throw error;
      if (mode === 'quiz' && data?.questions) {
        setQuestions(data.questions);
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

  const submitAnswer = (value: any) => {
    setAnswers(prev => ({ ...prev, [currentQ]: value }));
  };

  const nextQuestion = () => {
    if (mode === 'viva') {
      setVivaAnswers(prev => { const n = [...prev]; n[currentQ] = vivaAnswer; return n; });
    }
    if (currentQ < (mode === 'quiz' ? questions.length : vivaQuestions.length) - 1) {
      setCurrentQ(c => c + 1);
      setVivaAnswer('');
      setVivaRevealed(false);
    } else {
      setShowResults(true);
    }
  };

  const calcScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      const ans = answers[i];
      if (ans === undefined) return;
      switch (q.type) {
        case 'mcq': if (ans === q.correctIndex) correct++; break;
        case 'true_false': if (ans === q.answer) correct++; break;
        case 'fill_blank': if (typeof ans === 'string' && ans.toLowerCase().trim() === q.answer.toLowerCase().trim()) correct++; break;
        case 'match': {
          const pairs = q.correctPairs;
          if (Array.isArray(ans) && pairs.every((p, i2) => ans[i2] === p)) correct++;
          break;
        }
        // short_answer & essay are manually graded
        case 'short_answer': case 'essay': correct += 0.5; break;
      }
    });
    return correct;
  };

  const q = questions[currentQ];
  const vq = vivaQuestions[currentQ];
  const answered = answers[currentQ] !== undefined;

  const renderQuestionUI = (question: QuizQuestion, idx: number) => {
    switch (question.type) {
      case 'mcq':
        return (
          <div className="space-y-2">
            {question.options.map((opt, oi) => {
              const isCorrect = oi === question.correctIndex;
              const isSelected = answers[idx] === oi;
              const isAnswered = answers[idx] !== undefined;
              return (
                <motion.button
                  key={oi}
                  whileHover={!isAnswered ? { scale: 1.01 } : {}}
                  onClick={() => !isAnswered && submitAnswer(oi)}
                  disabled={isAnswered}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                    isAnswered && isCorrect ? 'border-green-500 bg-green-500/10' :
                    isAnswered && isSelected && !isCorrect ? 'border-destructive bg-destructive/10' :
                    isAnswered ? 'opacity-60' :
                    'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <span className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-medium shrink-0 ${
                    isAnswered && isCorrect ? 'border-green-500 text-green-500' :
                    isAnswered && isSelected ? 'border-destructive text-destructive' :
                    'border-border text-muted-foreground'
                  }`}>
                    {isAnswered && isCorrect ? <CheckCircle2 className="h-4 w-4" /> :
                     isAnswered && isSelected ? <XCircle className="h-4 w-4" /> :
                     String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-sm">{opt}</span>
                </motion.button>
              );
            })}
          </div>
        );

      case 'true_false':
        return (
          <div className="flex gap-3">
            {[true, false].map(val => {
              const isAnswered = answers[idx] !== undefined;
              const isSelected = answers[idx] === val;
              const isCorrect = val === question.answer;
              return (
                <Button
                  key={String(val)}
                  variant="outline"
                  onClick={() => !isAnswered && submitAnswer(val)}
                  disabled={isAnswered}
                  className={`flex-1 h-14 text-lg font-semibold ${
                    isAnswered && isCorrect ? 'border-green-500 bg-green-500/10 text-green-600' :
                    isAnswered && isSelected && !isCorrect ? 'border-destructive bg-destructive/10 text-destructive' :
                    isAnswered ? 'opacity-60' : ''
                  }`}
                >
                  {val ? '✓ True' : '✗ False'}
                </Button>
              );
            })}
          </div>
        );

      case 'short_answer':
      case 'fill_blank':
        return (
          <div className="space-y-3">
            {question.type === 'fill_blank' && (
              <p className="text-sm text-muted-foreground italic">Fill in the blank below:</p>
            )}
            <Input
              value={answers[idx] || ''}
              onChange={e => submitAnswer(e.target.value)}
              placeholder={question.type === 'fill_blank' ? 'Your answer...' : 'Type your answer (1-3 sentences)'}
              disabled={answered && answers[idx] !== ''}
            />
            {answered && answers[idx] && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs font-medium text-green-600 mb-1">Expected Answer:</p>
                <p className="text-sm">{question.type === 'fill_blank' ? question.answer : question.expectedAnswer}</p>
              </div>
            )}
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-3">
            <Textarea
              value={answers[idx] || ''}
              onChange={e => submitAnswer(e.target.value)}
              placeholder="Write your essay answer..."
              className="min-h-[120px]"
            />
            {question.rubric && question.rubric.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Marking Rubric:</p>
                <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                  {question.rubric.map((r, ri) => <li key={ri}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        );

      case 'match':
        const userPairs: number[] = answers[idx] || new Array(question.leftColumn.length).fill(-1);
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Column A</p>
                {question.leftColumn.map((item, li) => (
                  <div key={li} className="p-2 rounded border border-border text-sm bg-card">
                    {li + 1}. {item}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Match with</p>
                {question.leftColumn.map((_, li) => (
                  <Select
                    key={li}
                    value={userPairs[li]?.toString() || ''}
                    onValueChange={v => {
                      const newPairs = [...userPairs];
                      newPairs[li] = parseInt(v);
                      submitAnswer(newPairs);
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {question.rightColumn.map((r, ri) => (
                        <SelectItem key={ri} value={ri.toString()}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (d === 'medium') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setQuestions([]); setVivaQuestions([]); setCurrentQ(0);
      setAnswers({}); setShowResults(false); setStarted(false);
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
            {mode === 'quiz' ? 'Quiz Generator' : 'Mock Viva Voce'} — {resource.title}
          </DialogTitle>
        </DialogHeader>

        {!started ? (
          <div className="space-y-5 py-2">
            <Tabs value={mode} onValueChange={v => setMode(v as QuizMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quiz" className="gap-2">
                  <BookOpen className="h-4 w-4" /> Custom Quiz
                </TabsTrigger>
                <TabsTrigger value="viva" className="gap-2">
                  <Mic className="h-4 w-4" /> Mock Viva
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === 'quiz' && (
              <div className="space-y-4">
                {/* Question Types */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" /> Question Types
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {QUESTION_TYPES.map(qt => (
                      <label key={qt.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                        <Checkbox
                          checked={selectedTypes.includes(qt.id)}
                          onCheckedChange={() => toggleType(qt.id)}
                        />
                        <span className="text-sm">{qt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Question Count */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Number of Questions: {questionCount}</Label>
                  <Slider
                    value={[questionCount]}
                    onValueChange={v => setQuestionCount(v[0])}
                    min={5}
                    max={20}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5</span><span>10</span><span>15</span><span>20</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Difficulty</Label>
                  <div className="flex gap-2">
                    {(['Easy', 'Medium', 'Hard'] as const).map(d => (
                      <Button
                        key={d}
                        variant={difficulty === d ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDifficulty(d)}
                        className="flex-1"
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Chapter Selection */}
                {chapters.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> Focus on Chapters/Sections
                    </Label>
                    <ScrollArea className="max-h-[120px]">
                      <div className="space-y-1">
                        {chapters.map((ch, ci) => (
                          <label key={ci} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer transition-colors">
                            <Checkbox
                              checked={selectedChapters.includes(ch)}
                              onCheckedChange={() => {
                                setSelectedChapters(prev =>
                                  prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
                                );
                              }}
                            />
                            <span className="text-xs">{ch}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    {selectedChapters.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">{selectedChapters.length} chapter(s) selected</p>
                    )}
                  </div>
                )}

                {/* Custom chapter input for books without detected chapters */}
                {chapters.length === 0 && resource.resource_type === 'book' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Chapter/Section (optional)</Label>
                    <Input
                      value={customChapter}
                      onChange={e => setCustomChapter(e.target.value)}
                      placeholder="e.g. Canto 1, Chapter 5, Unit 3..."
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Supports: Chapters, Cantos, Adhyayas, Sargas, Parvas, Skandhas, Units, Lessons, Parts
                    </p>
                  </div>
                )
              </div>
            )}

            {mode === 'viva' && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <h4 className="font-semibold text-sm">🎤 Mock Viva Voce</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Open-ended questions with progressive difficulty. Type your answer, then reveal the expected response.
                </p>
              </div>
            )}

            <Button onClick={generate} size="lg" className="w-full gap-2" disabled={mode === 'quiz' && selectedTypes.length === 0}>
              <Sparkles className="h-4 w-4" /> Start {mode === 'quiz' ? 'Quiz' : 'Viva'}
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating questions...</p>
          </div>
        ) : showResults ? (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-2">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
              {mode === 'quiz' ? (
                <>
                  <h3 className="text-2xl font-bold">{Math.round(calcScore())} / {questions.length}</h3>
                  <p className="text-muted-foreground text-sm">
                    {calcScore() >= questions.length * 0.8 ? 'Excellent! 🎉' :
                     calcScore() >= questions.length * 0.6 ? 'Good job! 👏' :
                     'Keep studying! 📚'}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold">Viva Complete!</h3>
                  <p className="text-muted-foreground text-sm">Review your answers below</p>
                </>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {mode === 'quiz' ? questions.map((qq, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/50 bg-card text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{qq.type.replace('_', ' ')}</Badge>
                      <p className="font-medium">{i + 1}. {qq.question}</p>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-1">{qq.explanation}</p>
                  </div>
                )) : vivaQuestions.map((vq, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/50 bg-card text-sm space-y-2">
                    <p className="font-medium">{i + 1}. {vq.question}</p>
                    {vivaAnswers[i] && (
                      <div className="p-2 rounded bg-primary/5 border border-primary/20">
                        <p className="text-xs">Your: {vivaAnswers[i]}</p>
                      </div>
                    )}
                    <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
                      <p className="text-xs">{vq.expectedAnswer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-center gap-2">
              <SaveResultButton
                toolType={mode === 'quiz' ? 'quiz' : 'viva'}
                aiOutput={mode === 'quiz' ? { questions, answers, score: calcScore() } : { questions: vivaQuestions, answers: vivaAnswers }}
                subject={resource.subject}
                resourceId={resource.id}
                resourceTitle={resource.title}
                inputContext={resource.title}
              />
              <Button onClick={() => { setStarted(false); setShowResults(false); }} variant="outline">Change Mode</Button>
              <Button onClick={generate} variant="secondary"><RotateCcw className="h-4 w-4 mr-1" /> Retry</Button>
            </div>
          </div>
        ) : mode === 'quiz' && q ? (
          <div className="space-y-4">
            <Progress value={((currentQ + 1) / questions.length) * 100} className="h-1.5" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Q {currentQ + 1} / {questions.length}</p>
              <Badge variant="outline" className="text-[10px]">{q.type.replace('_', ' ').toUpperCase()}</Badge>
            </div>
            <h3 className="text-base font-semibold">{q.question}</h3>
            {renderQuestionUI(q, currentQ)}

            {answered && q.explanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm"><strong>Explanation:</strong> {q.explanation}</p>
              </motion.div>
            )}

            <div className="flex justify-end">
              <Button onClick={nextQuestion} disabled={!answered && q.type !== 'essay' && q.type !== 'short_answer'}>
                {currentQ < questions.length - 1 ? 'Next' : 'Results'}
              </Button>
            </div>
          </div>
        ) : mode === 'viva' && vq ? (
          <div className="space-y-4">
            <Progress value={((currentQ + 1) / vivaQuestions.length) * 100} className="h-1.5" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Q {currentQ + 1} / {vivaQuestions.length}</p>
              <Badge variant="outline" className={difficultyColor(vq.difficulty)}>{vq.difficulty}</Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-2">🎤 Examiner asks:</p>
              <h3 className="text-base font-semibold">{vq.question}</h3>
            </div>
            <Textarea value={vivaAnswer} onChange={e => setVivaAnswer(e.target.value)} placeholder="Type your answer..." className="min-h-[80px]" disabled={vivaRevealed} />
            {!vivaRevealed ? (
              <Button onClick={() => setVivaRevealed(true)} variant="outline" className="w-full" disabled={!vivaAnswer.trim()}>Reveal Answer</Button>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-xs font-medium text-green-600 mb-1">Expected:</p>
                  <p className="text-sm">{vq.expectedAnswer}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">💡 {vq.examinerTip}</p>
              </motion.div>
            )}
            <div className="flex justify-end">
              <Button onClick={nextQuestion} disabled={!vivaRevealed}>
                {currentQ < vivaQuestions.length - 1 ? 'Next' : 'Results'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No content generated yet.</p>
            <Button onClick={generate} className="mt-3">Generate</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
