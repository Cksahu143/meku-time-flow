import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useExams, Exam } from '@/hooks/useExams';
import { useExamPeriods, ExamPeriodDay, DayType } from '@/hooks/useExamPeriods';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, BookOpen, Coffee, Palmtree, Clock, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExamFormDialog } from '@/components/exams/ExamFormDialog';
import { ExamBadge } from '@/components/exams/ExamBadge';
import { ExamPeriodFormDialog } from '@/components/exams/ExamPeriodFormDialog';
import { ExamPeriodSchedule } from '@/components/exams/ExamPeriodSchedule';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CalendarViewType = 'month' | 'week';

const DAY_TYPE_COLORS: Record<DayType, string> = {
  exam: 'bg-destructive/20 border-destructive/40',
  prep_leave: 'bg-blue-500/20 border-blue-500/40',
  holiday: 'bg-emerald-500/20 border-emerald-500/40',
  half_day: 'bg-amber-500/20 border-amber-500/40',
};

const DAY_TYPE_ICONS: Record<DayType, typeof BookOpen> = {
  exam: BookOpen,
  prep_leave: Coffee,
  holiday: Palmtree,
  half_day: Clock,
};

const DAY_TYPE_LABELS: Record<DayType, string> = {
  exam: 'Exam',
  prep_leave: 'Prep Leave',
  holiday: 'Holiday',
  half_day: 'Half Day',
};

export function CalendarView() {
  const [tasks] = useLocalStorage<Task[]>('tasks', []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');

  const { exams, createExam, updateExam, deleteExam, getExamsForDate } = useExams();
  const { periods, periodDays, createPeriod, updateDay, deletePeriod, getDaysForPeriod, getDayForDate } = useExamPeriods();

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const getWeekData = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  const hasTasksOnDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.some((task) => task.date === dateStr);
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter((task) => task.date === dateStr);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const getExamPosition = (exam: Exam, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const isStart = exam.start_date === dateStr;
    const isEnd = (exam.end_date || exam.start_date) === dateStr;
    const isMultiDay = exam.end_date && exam.end_date !== exam.start_date;
    const isMiddle = isMultiDay && !isStart && !isEnd;
    return { isStart, isEnd, isMiddle };
  };

  const handleExamClick = (exam: Exam) => { setSelectedExam(exam); setExamDialogOpen(true); };
  const handleAddExam = () => { setSelectedExam(null); setExamDialogOpen(true); };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const renderPeriodDayBadge = (pd: ExamPeriodDay) => {
    const Icon = DAY_TYPE_ICONS[pd.day_type];
    return (
      <div key={pd.id} className={cn('text-xs px-1.5 py-0.5 rounded border truncate flex items-center gap-1', DAY_TYPE_COLORS[pd.day_type])}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{pd.exam_title || DAY_TYPE_LABELS[pd.day_type]}</span>
      </div>
    );
  };

  const renderWeekPeriodDay = (pd: ExamPeriodDay) => {
    const Icon = DAY_TYPE_ICONS[pd.day_type];
    const period = periods.find(p => p.id === pd.period_id);
    return (
      <div key={pd.id} className={cn('flex items-center gap-3 p-3 rounded-lg', DAY_TYPE_COLORS[pd.day_type])}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate">{pd.exam_title || DAY_TYPE_LABELS[pd.day_type]}</div>
          <div className="text-sm text-muted-foreground">
            {pd.exam_subject && <span>{pd.exam_subject} · </span>}
            {pd.start_time && <span>{pd.start_time.slice(0, 5)}</span>}
            {pd.end_time && <span> – {pd.end_time.slice(0, 5)}</span>}
            {period && <span className="ml-2 opacity-70">({period.name})</span>}
          </div>
          {pd.notes && <div className="text-xs text-muted-foreground mt-0.5">{pd.notes}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full h-full p-4 md:p-6 lg:p-8 animate-slide-in-right">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <CalendarIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground font-display">Calendar</h2>
            <p className="text-sm text-muted-foreground">Track exams and schedules</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleAddExam} variant="outline" className="gap-2 rounded-xl border-border/30 hover:border-primary/20 hover:shadow-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Exam</span>
          </Button>
          <Button onClick={() => setPeriodDialogOpen(true)} className="gap-2 rounded-xl btn-premium">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Exam Period</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="periods">
            Exam Periods
            {periods.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{periods.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          {/* View toggle + navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button onClick={() => setViewType('month')} className={cn('px-4 py-2 rounded-lg font-medium transition-all hover:scale-105', viewType === 'month' ? 'bg-gradient-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>Month</button>
              <button onClick={() => setViewType('week')} className={cn('px-4 py-2 rounded-lg font-medium transition-all hover:scale-105', viewType === 'week' ? 'bg-gradient-primary text-primary-foreground shadow-md' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>Week</button>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => (viewType === 'month' ? navigateMonth(-1) : navigateWeek(-1))} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-lg font-bold min-w-[200px] text-center bg-gradient-primary bg-clip-text text-transparent">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <button onClick={() => (viewType === 'month' ? navigateMonth(1) : navigateWeek(1))} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {viewType === 'month' ? (
            <div className="card-premium rounded-2xl p-4">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {getMonthData().map((day, index) => {
                  if (day === null) return <div key={`empty-${index}`} className="aspect-square" />;

                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const hasTasks = hasTasksOnDate(date);
                  const dayExams = getExamsForDate(date);
                  const dateStr = date.toISOString().split('T')[0];
                  const periodDaysForDate = getDayForDate(dateStr);
                  const today = isToday(date);

                  return (
                    <div
                      key={day}
                      className={cn(
                        'min-h-[80px] p-2 rounded-lg border transition-all hover:shadow-md relative flex flex-col',
                        today && 'bg-gradient-primary text-primary-foreground border-primary font-bold',
                        !today && (hasTasks || dayExams.length > 0 || periodDaysForDate.length > 0) && 'bg-accent/20 border-accent',
                        !today && !hasTasks && dayExams.length === 0 && periodDaysForDate.length === 0 && 'bg-card border-border',
                      )}
                    >
                      <div className="text-sm mb-1">{day}</div>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {/* Period day badges */}
                        {periodDaysForDate.slice(0, 1).map(renderPeriodDayBadge)}
                        {/* Regular exams */}
                        {dayExams.slice(0, periodDaysForDate.length > 0 ? 1 : 2).map((exam) => {
                          const { isStart, isEnd, isMiddle } = getExamPosition(exam, date);
                          return <ExamBadge key={exam.id} exam={exam} compact onClick={() => handleExamClick(exam)} isStart={isStart} isEnd={isEnd} isMiddle={isMiddle} />;
                        })}
                        {(dayExams.length + periodDaysForDate.length) > 2 && (
                          <div className="text-xs text-muted-foreground pl-1">+{dayExams.length + periodDaysForDate.length - 2} more</div>
                        )}
                      </div>
                      {hasTasks && <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {getWeekData().map((date) => {
                const dayTasks = getTasksForDate(date);
                const dayExams = getExamsForDate(date);
                const dateStr = date.toISOString().split('T')[0];
                const periodDaysForDate = getDayForDate(dateStr);
                const today = isToday(date);

                return (
                  <div key={date.toISOString()} className={cn('card-premium rounded-2xl p-4 transition-all', today && 'border-primary shadow-md ring-1 ring-primary/20')}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg', today ? 'bg-gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                          {date.getDate()}
                        </div>
                        <div>
                          <div className="font-semibold">{weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1]}</div>
                          <div className="text-sm text-muted-foreground">{monthNames[date.getMonth()]} {date.getFullYear()}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {periodDaysForDate.map(pd => (
                          <Badge key={pd.id} variant="outline" className={cn('text-xs', DAY_TYPE_COLORS[pd.day_type])}>
                            {DAY_TYPE_LABELS[pd.day_type]}
                          </Badge>
                        ))}
                        {dayExams.length > 0 && (
                          <div className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-sm font-medium flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {dayExams.length} exam{dayExams.length > 1 ? 's' : ''}
                          </div>
                        )}
                        {dayTasks.length > 0 && (
                          <div className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                            {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Period days */}
                    {periodDaysForDate.length > 0 && (
                      <div className="space-y-2 mb-3">{periodDaysForDate.map(renderWeekPeriodDay)}</div>
                    )}

                    {/* Regular exams */}
                    {dayExams.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {dayExams.map((exam) => {
                          const { isStart, isEnd, isMiddle } = getExamPosition(exam, date);
                          return (
                            <div key={exam.id} onClick={() => handleExamClick(exam)} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] bg-destructive/10 border border-destructive/20 hover:bg-destructive/20">
                              <BookOpen className="w-5 h-5 text-destructive flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground truncate">{exam.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {exam.subject} • {exam.start_time.slice(0, 5)}
                                  {isStart && exam.end_date && exam.end_date !== exam.start_date && <span className="ml-1 text-destructive">(Day 1)</span>}
                                  {isEnd && exam.end_date && exam.end_date !== exam.start_date && <span className="ml-1 text-destructive">(Final Day)</span>}
                                  {isMiddle && <span className="ml-1 text-destructive">(Continues)</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {dayTasks.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-border">
                        {dayTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 p-2 rounded bg-muted">
                            <div className={cn('w-2 h-2 rounded-full', task.priority === 'high' && 'bg-destructive', task.priority === 'medium' && 'bg-accent', task.priority === 'low' && 'bg-success')} />
                            <span className={cn(task.completed && 'line-through opacity-60')}>{task.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="periods">
          <div className="space-y-4">
            {periods.length === 0 ? (
              <div className="text-center py-12 card-premium rounded-2xl">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-1">No Exam Periods</h3>
                <p className="text-muted-foreground mb-4">Create an exam period to schedule different exams, prep leaves, and holidays across multiple days.</p>
                <Button onClick={() => setPeriodDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Exam Period
                </Button>
              </div>
            ) : (
              periods.map((period) => (
                <ExamPeriodSchedule
                  key={period.id}
                  period={period}
                  days={getDaysForPeriod(period.id)}
                  onUpdateDay={updateDay}
                  onDeletePeriod={deletePeriod}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ExamFormDialog open={examDialogOpen} onOpenChange={setExamDialogOpen} exam={selectedExam} onSave={createExam} onUpdate={updateExam} onDelete={deleteExam} />
      <ExamPeriodFormDialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen} onSave={createPeriod} />
    </div>
  );
}
