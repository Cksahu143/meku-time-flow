import { useState } from 'react';
import { Bot, Layers, MessageSquareText, BrainCircuit, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { DbResource } from '@/hooks/useResources';
import { CoCoChatDialog } from './CoCoChatDialog';
import { FlashcardsDialog } from './FlashcardsDialog';
import { SlideDeckDialog } from './SlideDeckDialog';
import { QuizDialog } from './QuizDialog';

interface AIToolsMenuProps {
  resource: DbResource;
}

export const AIToolsMenu = ({ resource }: AIToolsMenuProps) => {
  const [showCoco, setShowCoco] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showSlides, setShowSlides] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  const resourceContent = resource.content || resource.description || '';

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
          <DropdownMenuItem onClick={() => setShowCoco(true)} className="gap-2">
            <MessageSquareText className="h-4 w-4" /> Ask CoCo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowFlashcards(true)} className="gap-2">
            <Layers className="h-4 w-4" /> Generate Flashcards
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowSlides(true)} className="gap-2">
            <BrainCircuit className="h-4 w-4" /> Generate Slide Deck
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowQuiz(true)} className="gap-2">
            <Sparkles className="h-4 w-4" /> Generate Quiz
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CoCoChatDialog
        open={showCoco}
        onOpenChange={setShowCoco}
        resource={resource}
        content={resourceContent}
      />
      <FlashcardsDialog
        open={showFlashcards}
        onOpenChange={setShowFlashcards}
        resource={resource}
        content={resourceContent}
      />
      <SlideDeckDialog
        open={showSlides}
        onOpenChange={setShowSlides}
        resource={resource}
        content={resourceContent}
      />
      <QuizDialog
        open={showQuiz}
        onOpenChange={setShowQuiz}
        resource={resource}
        content={resourceContent}
      />
    </>
  );
};
