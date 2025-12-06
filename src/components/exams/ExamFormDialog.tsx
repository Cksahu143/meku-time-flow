import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Exam } from '@/hooks/useExams';
import { useDebounce } from '@/hooks/useDebounce';

interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Exam | null;
  onSave: (exam: Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate?: (id: string, updates: Partial<Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<any>;
  onDelete?: (id: string) => Promise<boolean>;
}

export function ExamFormDialog({
  open,
  onOpenChange,
  exam,
  onSave,
  onUpdate,
  onDelete,
}: ExamFormDialogProps) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const debouncedTitle = useDebounce(title, 500);
  const debouncedSubject = useDebounce(subject, 500);
  const debouncedStartTime = useDebounce(startTime, 500);

  // Initialize form with exam data
  useEffect(() => {
    if (exam) {
      setTitle(exam.title);
      setSubject(exam.subject);
      setStartDate(new Date(exam.start_date));
      setStartTime(exam.start_time.slice(0, 5));
      setIsMultiDay(!!exam.end_date && exam.end_date !== exam.start_date);
      setEndDate(exam.end_date ? new Date(exam.end_date) : undefined);
    } else {
      setTitle('');
      setSubject('');
      setStartDate(new Date());
      setStartTime('09:00');
      setIsMultiDay(false);
      setEndDate(undefined);
    }
  }, [exam, open]);

  // Auto-save when editing existing exam
  const autoSave = useCallback(async () => {
    if (!exam || !onUpdate) return;
    if (!debouncedTitle.trim() || !debouncedSubject.trim() || !startDate) return;

    const updates: Partial<Omit<Exam, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {
      title: debouncedTitle.trim(),
      subject: debouncedSubject.trim(),
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: debouncedStartTime,
      end_date: isMultiDay && endDate ? format(endDate, 'yyyy-MM-dd') : null,
    };

    await onUpdate(exam.id, updates);
  }, [exam, onUpdate, debouncedTitle, debouncedSubject, startDate, debouncedStartTime, isMultiDay, endDate]);

  useEffect(() => {
    if (exam && open) {
      autoSave();
    }
  }, [debouncedTitle, debouncedSubject, debouncedStartTime, startDate, isMultiDay, endDate, exam, open, autoSave]);

  const handleSave = async () => {
    if (!title.trim() || !subject.trim() || !startDate) return;

    setSaving(true);
    try {
      const examData = {
        title: title.trim(),
        subject: subject.trim(),
        start_date: format(startDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_date: isMultiDay && endDate ? format(endDate, 'yyyy-MM-dd') : null,
      };

      if (exam && onUpdate) {
        await onUpdate(exam.id, examData);
      } else {
        await onSave(examData);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!exam || !onDelete) return;
    setSaving(true);
    try {
      const success = await onDelete(exam.id);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            {exam ? 'Edit Exam' : 'Add New Exam'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Math Final Exam"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Mathematics"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Multi-day Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="multiDay">Multi-day Exam</Label>
              <p className="text-sm text-muted-foreground">
                Toggle if exam spans multiple days
              </p>
            </div>
            <Switch
              id="multiDay"
              checked={isMultiDay}
              onCheckedChange={(checked) => {
                setIsMultiDay(checked);
                if (!checked) setEndDate(undefined);
              }}
            />
          </div>

          {/* End Date (if multi-day) */}
          {isMultiDay && (
            <div className="space-y-2 animate-fade-in">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {exam && onDelete && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
                className="flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            {!exam && (
              <Button
                onClick={handleSave}
                disabled={saving || !title.trim() || !subject.trim() || !startDate}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Add Exam'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
