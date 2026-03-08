import { useState, useEffect, useRef, useCallback } from 'react';
import { ExamPeriodDay, DayType } from '@/hooks/useExamPeriods';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Coffee, Palmtree, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_TYPE_CONFIG: Record<DayType, { label: string; color: string; icon: typeof BookOpen }> = {
  exam: { label: 'Exam', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: BookOpen },
  prep_leave: { label: 'Prep Leave', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Coffee },
  holiday: { label: 'Holiday', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: Palmtree },
  half_day: { label: 'Half Day', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
};

interface ExamDayRowProps {
  day: ExamPeriodDay;
  onUpdateDay: (dayId: string, updates: Partial<Pick<ExamPeriodDay, 'day_type' | 'exam_title' | 'exam_subject' | 'start_time' | 'end_time' | 'notes'>>) => Promise<any>;
}

export function ExamDayRow({ day, onUpdateDay }: ExamDayRowProps) {
  // Local state for all text fields — prevents keystroke lag
  const [localTitle, setLocalTitle] = useState(day.exam_title || '');
  const [localSubject, setLocalSubject] = useState(day.exam_subject || '');
  const [localStartTime, setLocalStartTime] = useState(day.start_time?.slice(0, 5) || '');
  const [localEndTime, setLocalEndTime] = useState(day.end_time?.slice(0, 5) || '');
  const [localNotes, setLocalNotes] = useState(day.notes || '');

  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync from parent only when the day.id changes (new day selected)
  useEffect(() => {
    setLocalTitle(day.exam_title || '');
    setLocalSubject(day.exam_subject || '');
    setLocalStartTime(day.start_time?.slice(0, 5) || '');
    setLocalEndTime(day.end_time?.slice(0, 5) || '');
    setLocalNotes(day.notes || '');
  }, [day.id]); // Only on day ID change, not on every prop update

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  const debouncedUpdate = useCallback((field: string, updates: Parameters<typeof onUpdateDay>[1]) => {
    if (debounceRef.current[field]) clearTimeout(debounceRef.current[field]);
    debounceRef.current[field] = setTimeout(() => {
      onUpdateDay(day.id, updates);
    }, 600);
  }, [day.id, onUpdateDay]);

  const handleDayTypeChange = (val: DayType) => {
    if (val !== 'exam' && val !== 'half_day') {
      setLocalTitle('');
      setLocalSubject('');
      setLocalStartTime('');
      setLocalEndTime('');
      onUpdateDay(day.id, { day_type: val, exam_title: null, exam_subject: null, start_time: null, end_time: null });
    } else {
      onUpdateDay(day.id, { day_type: val });
    }
  };

  const dayDate = parseISO(day.date);
  const dayName = format(dayDate, 'EEE');
  const config = DAY_TYPE_CONFIG[day.day_type];

  return (
    <div className="p-3 transition-colors">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date */}
        <div className="w-16 text-center flex-shrink-0">
          <div className="text-xs text-muted-foreground">{dayName}</div>
          <div className="font-bold text-lg">{format(dayDate, 'd')}</div>
          <div className="text-xs text-muted-foreground">{format(dayDate, 'MMM')}</div>
        </div>

        {/* Day Type Select */}
        <Select value={day.day_type} onValueChange={handleDayTypeChange}>
          <SelectTrigger className={cn('w-[130px]', config.color)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DAY_TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Exam details */}
        {(day.day_type === 'exam' || day.day_type === 'half_day') ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Input
              placeholder="Exam title"
              value={localTitle}
              onChange={(e) => {
                setLocalTitle(e.target.value);
                debouncedUpdate('title', { exam_title: e.target.value });
              }}
              className="w-40 h-8 text-sm"
            />
            <Input
              placeholder="Subject"
              value={localSubject}
              onChange={(e) => {
                setLocalSubject(e.target.value);
                debouncedUpdate('subject', { exam_subject: e.target.value });
              }}
              className="w-32 h-8 text-sm"
            />
            <Input
              type="time"
              value={localStartTime}
              onChange={(e) => {
                setLocalStartTime(e.target.value);
                debouncedUpdate('start', { start_time: e.target.value });
              }}
              className="w-28 h-8 text-sm"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="time"
              value={localEndTime}
              onChange={(e) => {
                setLocalEndTime(e.target.value);
                debouncedUpdate('end', { end_time: e.target.value });
              }}
              className="w-28 h-8 text-sm"
            />
          </div>
        ) : (
          <div className="flex-1">
            <Input
              placeholder="Notes (optional)"
              value={localNotes}
              onChange={(e) => {
                setLocalNotes(e.target.value);
                debouncedUpdate('notes', { notes: e.target.value });
              }}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
