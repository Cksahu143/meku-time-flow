import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';

interface ThemeCustomizationProps {
  subjects: string[];
  themeColors: Record<string, string>;
  onUpdateColors: (colors: Record<string, string>) => void;
}

export const ThemeCustomization: React.FC<ThemeCustomizationProps> = ({
  subjects,
  themeColors,
  onUpdateColors,
}) => {
  const [colors, setColors] = useState(themeColors);
  const [open, setOpen] = useState(false);

  const handleColorChange = (subject: string, color: string) => {
    setColors({ ...colors, [subject]: color });
  };

  const handleSave = () => {
    onUpdateColors(colors);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Palette className="h-4 w-4 mr-2" />
          Customize Colors
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Subject Colors</DialogTitle>
          <DialogDescription>
            Choose a color for each subject to personalize your timetable
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {subjects.map((subject) => (
            <div key={subject} className="flex items-center gap-4">
              <Label className="flex-1">{subject}</Label>
              <Input
                type="color"
                value={colors[subject] || '#3b82f6'}
                onChange={(e) => handleColorChange(subject, e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
            </div>
          ))}
          <Button onClick={handleSave} className="w-full">
            Save Colors
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
