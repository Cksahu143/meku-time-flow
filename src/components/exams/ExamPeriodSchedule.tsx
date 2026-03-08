import { useState } from 'react';
import { ExamPeriod, ExamPeriodDay, DayType } from '@/hooks/useExamPeriods';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { ExamDayRow } from './ExamDayRow';

interface ExamPeriodScheduleProps {
  period: ExamPeriod;
  days: ExamPeriodDay[];
  onUpdateDay: (dayId: string, updates: Partial<Pick<ExamPeriodDay, 'day_type' | 'exam_title' | 'exam_subject' | 'start_time' | 'end_time' | 'notes'>>) => Promise<any>;
  onDeletePeriod: (periodId: string) => Promise<boolean>;
}

export function ExamPeriodSchedule({ period, days, onUpdateDay, onDeletePeriod }: ExamPeriodScheduleProps) {
  const [expanded, setExpanded] = useState(true);

  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const examCount = days.filter((d) => d.day_type === 'exam' || d.day_type === 'half_day').length;
  const prepCount = days.filter((d) => d.day_type === 'prep_leave').length;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">{period.name}</h3>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(period.start_date), 'MMM d')} – {format(parseISO(period.end_date), 'MMM d, yyyy')} · {days.length} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-2">
            <Badge variant="outline" className="text-xs">{examCount} exams</Badge>
            <Badge variant="outline" className="text-xs">{prepCount} prep</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDeletePeriod(period.id); }}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Day list */}
      {expanded && (
        <div className="divide-y divide-border">
          {sortedDays.map((day) => (
            <ExamDayRow key={day.id} day={day} onUpdateDay={onUpdateDay} />
          ))}
        </div>
      )}
    </div>
  );
}
