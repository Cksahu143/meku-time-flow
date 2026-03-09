import { useState, useEffect } from 'react';
import { Bot, Layers, MessageSquareText, BrainCircuit, Sparkles, Volume2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DbResource } from '@/hooks/useResources';
import { CoCoChatDialog } from './CoCoChatDialog';
import { FlashcardsDialog } from './FlashcardsDialog';
import { SlideDeckDialog } from './SlideDeckDialog';
import { QuizDialog } from './QuizDialog';
import { AudioOverviewDialog } from './AudioOverviewDialog';
import { supabase } from '@/integrations/supabase/client';

interface AIToolsMenuProps {
  resource: DbResource;
}

const GRADE_LEVELS = [
  'Nursery', 'LKG', 'UKG',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
];

export const AIToolsMenu = ({ resource }: AIToolsMenuProps) => {
  const [showCoco, setShowCoco] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showSlides, setShowSlides] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [gradeLoaded, setGradeLoaded] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [pendingTool, setPendingTool] = useState<'coco' | 'flashcards' | 'slides' | 'quiz' | 'audio' | null>(null);

  const resourceContent = resource.content || resource.description || '';

  // Fetch student's grade from class_students on mount
  useEffect(() => {
    const fetchGrade = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setGradeLoaded(true); return; }

      // Check class_students for active enrollment
      const { data } = await (supabase
        .from('class_students' as any)
        .select('class_id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .limit(1) as any);

      if (data && data.length > 0) {
        // Fetch the class details
        const { data: classData } = await (supabase
          .from('classes' as any)
          .select('grade_level')
          .eq('id', data[0].class_id)
          .limit(1) as any);

        if (classData && classData.length > 0) {
          setGradeLevel(classData[0].grade_level);
        }
      }
      setGradeLoaded(true);
    };
    fetchGrade();
  }, []);

  const openTool = (tool: 'coco' | 'flashcards' | 'slides' | 'quiz' | 'audio') => {
    if (!gradeLoaded) return;
    if (!gradeLevel) {
      // Ask student to pick their grade
      setPendingTool(tool);
      setShowGradePicker(true);
      return;
    }
    launchTool(tool);
  };

  const launchTool = (tool: string) => {
    switch (tool) {
      case 'coco': setShowCoco(true); break;
      case 'flashcards': setShowFlashcards(true); break;
      case 'slides': setShowSlides(true); break;
      case 'quiz': setShowQuiz(true); break;
      case 'audio': setShowAudio(true); break;
    }
  };

  const handleGradeSelected = () => {
    setShowGradePicker(false);
    if (pendingTool && gradeLevel) {
      launchTool(pendingTool);
      setPendingTool(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary">
            <Sparkles className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="flex items-center gap-2 text-xs">
            <Bot className="h-3.5 w-3.5" /> AI Study Tools
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openTool('coco')} className="gap-2">
            <MessageSquareText className="h-4 w-4" /> Ask CoCo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openTool('flashcards')} className="gap-2">
            <Layers className="h-4 w-4" /> Generate Flashcards
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openTool('slides')} className="gap-2">
            <BrainCircuit className="h-4 w-4" /> Generate Slide Deck
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openTool('quiz')} className="gap-2">
            <Sparkles className="h-4 w-4" /> Quiz / Mock Viva
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openTool('audio')} className="gap-2">
            <Volume2 className="h-4 w-4" /> Audio Overview
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Grade picker dialog */}
      <Dialog open={showGradePicker} onOpenChange={setShowGradePicker}>
        <DialogContent className="max-w-sm" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>What class are you in?</DialogTitle>
            <DialogDescription>
              CoCo adjusts difficulty and question count based on your grade level.
            </DialogDescription>
          </DialogHeader>
          <Select value={gradeLevel || ''} onValueChange={v => setGradeLevel(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select your class" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGradeSelected} disabled={!gradeLevel} className="w-full mt-2">
            Continue
          </Button>
        </DialogContent>
      </Dialog>

      <CoCoChatDialog
        open={showCoco}
        onOpenChange={setShowCoco}
        resource={resource}
        content={resourceContent}
        gradeLevel={gradeLevel || undefined}
        fileName={resource.file_name || undefined}
      />
      <FlashcardsDialog
        open={showFlashcards}
        onOpenChange={setShowFlashcards}
        resource={resource}
        content={resourceContent}
        gradeLevel={gradeLevel || undefined}
        fileName={resource.file_name || undefined}
      />
      <SlideDeckDialog
        open={showSlides}
        onOpenChange={setShowSlides}
        resource={resource}
        content={resourceContent}
        gradeLevel={gradeLevel || undefined}
        fileName={resource.file_name || undefined}
      />
      <QuizDialog
        open={showQuiz}
        onOpenChange={setShowQuiz}
        resource={resource}
        content={resourceContent}
        gradeLevel={gradeLevel || undefined}
        fileName={resource.file_name || undefined}
      />
      <AudioOverviewDialog
        open={showAudio}
        onOpenChange={setShowAudio}
        resource={resource}
        content={resourceContent}
        gradeLevel={gradeLevel || undefined}
        fileName={resource.file_name || undefined}
      />
    </>
  );
};
