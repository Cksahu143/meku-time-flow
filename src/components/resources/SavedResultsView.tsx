import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trash2, Layers, Sparkles, BrainCircuit, BarChart3, GitBranch, BookOpen, Loader2, Eye, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PageTransition } from '@/components/motion/PageTransition';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useSavedAIResults, SavedAIResult } from '@/hooks/useSavedAIResults';

const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  flashcards: { label: 'Flashcards', icon: Layers, color: 'bg-blue-500/10 text-blue-500' },
  quiz: { label: 'Quiz', icon: Sparkles, color: 'bg-purple-500/10 text-purple-500' },
  viva: { label: 'Mock Viva', icon: Sparkles, color: 'bg-purple-500/10 text-purple-500' },
  slides: { label: 'Slide Deck', icon: BrainCircuit, color: 'bg-green-500/10 text-green-500' },
  report: { label: 'AI Report', icon: BarChart3, color: 'bg-orange-500/10 text-orange-500' },
  mindmap: { label: 'Mind Map', icon: GitBranch, color: 'bg-teal-500/10 text-teal-500' },
  summary: { label: 'Summary', icon: BookOpen, color: 'bg-indigo-500/10 text-indigo-500' },
  coco_chat: { label: 'CoCo Chat', icon: Eye, color: 'bg-pink-500/10 text-pink-500' },
  podcast: { label: 'Podcast', icon: Layers, color: 'bg-amber-500/10 text-amber-500' },
  audio_overview: { label: 'Audio Overview', icon: Layers, color: 'bg-cyan-500/10 text-cyan-500' },
};

const getMeta = (type: string) => TOOL_META[type] || { label: type, icon: Save, color: 'bg-muted text-muted-foreground' };

export const SavedResultsView: React.FC = () => {
  const { results, loading, deleteResult } = useSavedAIResults();
  const [selectedResult, setSelectedResult] = useState<SavedAIResult | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const toolTypes = [...new Set(results.map(r => r.tool_type))];
  const filtered = filter === 'all' ? results : results.filter(r => r.tool_type === filter);

  const renderOutput = (result: SavedAIResult) => {
    const output = result.ai_output;
    if (result.tool_type === 'flashcards' && output?.flashcards) {
      return (
        <div className="space-y-3">
          {output.flashcards.map((card: any, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-border/50 bg-card">
              <p className="text-sm font-medium text-foreground mb-1">Q: {card.front}</p>
              <p className="text-sm text-muted-foreground">A: {card.back}</p>
            </div>
          ))}
        </div>
      );
    }
    if (result.tool_type === 'quiz' && output?.questions) {
      return (
        <div className="space-y-3">
          {output.questions.map((q: any, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-border/50 bg-card">
              <p className="text-sm font-medium text-foreground mb-2">{i + 1}. {q.question}</p>
              {q.options?.map((opt: string, oi: number) => (
                <p key={oi} className={`text-xs pl-4 ${oi === q.correctIndex ? 'text-green-500 font-medium' : 'text-muted-foreground'}`}>
                  {String.fromCharCode(65 + oi)}. {opt} {oi === q.correctIndex && '✓'}
                </p>
              ))}
              <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
            </div>
          ))}
        </div>
      );
    }
    if (result.tool_type === 'slides' && output?.slides) {
      return (
        <div className="space-y-3">
          {output.slides.map((s: any, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-border/50 bg-card">
              <p className="text-sm font-bold text-foreground mb-1">{i + 1}. {s.title}</p>
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
                {s.bullets?.map((b: string, bi: number) => <li key={bi}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      );
    }
    if (result.tool_type === 'report' && output) {
      return (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{output.overallScore}%</span>
            <Badge variant="secondary">{output.overallGrade}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{output.summary}</p>
        </div>
      );
    }
    if (result.tool_type === 'coco_chat' && output?.messages) {
      return (
        <div className="space-y-2">
          {output.messages.map((msg: any, i: number) => (
            <div key={i} className={`p-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-primary/10 text-foreground ml-8' : 'bg-muted mr-8'}`}>
              <span className="text-xs font-medium text-muted-foreground">{msg.role === 'user' ? 'You' : 'CoCo'}:</span>
              <p className="mt-0.5">{msg.content.length > 200 ? msg.content.slice(0, 200) + '…' : msg.content}</p>
            </div>
          ))}
        </div>
      );
    }
    if ((result.tool_type === 'podcast' || result.tool_type === 'audio_overview') && output?.text) {
      return (
        <div className="space-y-2">
          {output.language && <Badge variant="secondary" className="text-xs">{output.language}</Badge>}
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{output.text.length > 500 ? output.text.slice(0, 500) + '…' : output.text}</p>
        </div>
      );
    }
    if (result.tool_type === 'mindmap' && output?.centralTopic) {
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Central: {output.centralTopic}</p>
          <div className="flex flex-wrap gap-1">
            {output.nodes?.slice(0, 6).map((n: any, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">{n.label}</Badge>
            ))}
            {output.nodes?.length > 6 && <Badge variant="secondary" className="text-xs">+{output.nodes.length - 6} more</Badge>}
          </div>
        </div>
      );
    }
    if (typeof output === 'string') {
      return <MarkdownRenderer content={output} />;
    }
    return <pre className="text-xs text-muted-foreground overflow-auto max-h-64">{JSON.stringify(output, null, 2)}</pre>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition className="p-4 md:p-6 max-w-7xl mx-auto">
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Save className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Saved AI Results</h1>
          <p className="text-sm text-muted-foreground">{results.length} saved results from AI study tools</p>
        </div>
      </motion.div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant={filter === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setFilter('all')}>
          All ({results.length})
        </Badge>
        {toolTypes.map(type => {
          const meta = getMeta(type);
          const count = results.filter(r => r.tool_type === type).length;
          return (
            <Badge key={type} variant={filter === type ? 'default' : 'outline'} className="cursor-pointer gap-1" onClick={() => setFilter(type)}>
              <meta.icon className="h-3 w-3" /> {meta.label} ({count})
            </Badge>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Save className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">No saved results</h3>
          <p className="text-sm text-muted-foreground">Generate content with AI tools and click "Save" to keep it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(result => {
            const meta = getMeta(result.tool_type);
            const Icon = meta.icon;
            return (
              <motion.div key={result.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedResult(result)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className={`gap-1 text-xs ${meta.color}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={e => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete saved result?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteResult(result.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <CardTitle className="text-sm font-medium line-clamp-2 mt-1">
                      {result.resource_title || result.input_context || 'Untitled'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-2">{result.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(result.created_at).toLocaleDateString()} · {new Date(result.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedResult} onOpenChange={v => { if (!v) setSelectedResult(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedResult && (() => { const m = getMeta(selectedResult.tool_type); return <m.icon className="h-5 w-5 text-primary" />; })()}
              {selectedResult?.resource_title || 'Saved Result'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="pr-4 pb-4">
              {selectedResult && (
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{getMeta(selectedResult.tool_type).label}</Badge>
                    <Badge variant="secondary">{selectedResult.subject}</Badge>
                    <Badge variant="secondary">{new Date(selectedResult.created_at).toLocaleDateString()}</Badge>
                  </div>
                  {renderOutput(selectedResult)}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};
