import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
}

const REACTIONS = ['❤️', '🔥', '😂', '👍', '😮', '😢', '🎉', '💯'];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onReact }) => {
  const [open, setOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all hover-scale"
        >
          <SmilePlus className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 animate-scale-in">
        <div className="flex gap-1">
          {REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              className="h-10 w-10 text-xl hover-scale"
              onClick={() => handleReact(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};