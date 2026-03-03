import { useState } from 'react';
import { ExamPeriod, ExamPeriodDay, DayType } from '@/hooks/useExamPeriods';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, BookOpen, Coffee, Palmtree, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_TYPE_CONFIG: Record<DayType, { label: string; color: string; icon: typeof BookOpen }> = {
  exam: { label: 'Exam', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: BookOpen },
  prep_leave: { label: 'Prep Leave', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Coffee },
  holiday: { label: 'Holiday', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', icon: Palmtree },
  half_day: { label: 'Half Day', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock },
};

interface ExamPeriodScheduleProps {
  period: ExamPeriod;
  days: ExamPeriodDay[];
  onUpdateDay: (dayId: string, updates: Partial<Pick<ExamPeriodDay, 'day_type' | 'exam_title' | 'exam_subject' | 'start_time' | 'end_time' | 'notes'>>) => Promise<any>;
  onDeletePeriod: (periodId: string) => Promise<boolean>;
}

export function ExamPeriodSchedule({ period, days, onUpdateDay, onDeletePeriod }: ExamPeriodScheduleProps) {
  const [expanded, setExpanded] = useState(true);
  const [editingDay, setEditingDay] = useState<string | null>(null);

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
          {sortedDays.map((day) => {
            const config = DAY_TYPE_CONFIG[day.day_type];
            const Icon = config.icon;
            const isEditing = editingDay === day.id;
            const dayDate = parseISO(day.date);
            const dayName = format(dayDate, 'EEE');

            return (
              <div key={day.id} className={cn('p-3 transition-colors', isEditing && 'bg-muted/30')}>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Date */}
                  <div className="w-16 text-center flex-shrink-0">
                    <div className="text-xs text-muted-foreground">{dayName}</div>
                    <div className="font-bold text-lg">{format(dayDate, 'd')}</div>
                    <div className="text-xs text-muted-foreground">{format(dayDate, 'MMM')}</div>
                  </div>

                  {/* Day Type Select */}
                  <Select
                    value={day.day_type}
                    onValueChange={(val: DayType) => {
                      onUpdateDay(day.id, { day_type: val });
                      if (val !== 'exam' && val !== 'half_day') {
                        onUpdateDay(day.id, { day_type: val, exam_title: null, exam_subject: null, start_time: null, end_time: null });
                      }
                    }}
                  >
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

                  {/* Exam details (inline for exam/half_day) */}
                  {(day.day_type === 'exam' || day.day_type === 'half_day') ? (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <Input
                        placeholder="Exam title"
                        value={day.exam_title || ''}
                        onChange={(e) => onUpdateDay(day.id, { exam_title: e.target.value })}
                        className="w-40 h-8 text-sm"
                      />
                      <Input
                        placeholder="Subject"
                        value={day.exam_subject || ''}
                        onChange={(e) => onUpdateDay(day.id, { exam_subject: e.target.value })}
                        className="w-32 h-8 text-sm"
                      />
                      <Input
                        type="time"
                        value={day.start_time?.slice(0, 5) || ''}
                        onChange={(e) => onUpdateDay(day.id, { start_time: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="time"
                        value={day.end_time?.slice(0, 5) || ''}
                        onChange={(e) => onUpdateDay(day.id, { end_time: e.target.value })}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                  ) : (
                    <div className="flex-1">
                      <Input
                        placeholder="Notes (optional)"
                        value={day.notes || ''}
                        onChange={(e) => onUpdateDay(day.id, { notes: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
