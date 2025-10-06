import { useState } from 'react';
import { Task } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalendarViewType = 'month' | 'week';

export function CalendarView() {
  const [tasks] = useLocalStorage<Task[]>('tasks', []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>('month');

  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

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
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-6 animate-slide-in-right">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold text-foreground">Calendar</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewType('month')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                viewType === 'month'
                  ? 'bg-gradient-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              Month
            </button>
            <button
              onClick={() => setViewType('week')}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-all',
                viewType === 'week'
                  ? 'bg-gradient-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (viewType === 'month' ? navigateMonth(-1) : navigateWeek(-1))}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-lg font-semibold min-w-[200px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>

            <button
              onClick={() => (viewType === 'month' ? navigateMonth(1) : navigateWeek(1))}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all hover:scale-110"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {viewType === 'month' ? (
        <div className="bg-card rounded-lg border border-border shadow-lg p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {getMonthData().map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              );
              const hasTasks = hasTasksOnDate(date);
              const today = isToday(date);

              return (
                <div
                  key={day}
                  className={cn(
                    'aspect-square p-2 rounded-lg border transition-all cursor-pointer',
                    'hover:shadow-md hover:scale-105',
                    today &&
                      'bg-gradient-primary text-primary-foreground border-primary font-bold',
                    !today && hasTasks && 'bg-accent/20 border-accent',
                    !today && !hasTasks && 'bg-card border-border',
                    'relative'
                  )}
                >
                  <div className="text-sm">{day}</div>
                  {hasTasks && (
                    <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {getWeekData().map((date) => {
            const dayTasks = getTasksForDate(date);
            const today = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  'bg-card rounded-lg border p-4 transition-all',
                  today && 'border-primary shadow-md'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg',
                        today
                          ? 'bg-gradient-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      )}
                    >
                      {date.getDate()}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {monthNames[date.getMonth()]} {date.getFullYear()}
                      </div>
                    </div>
                  </div>

                  {dayTasks.length > 0 && (
                    <div className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                      {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {dayTasks.length > 0 && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-border">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 p-2 rounded bg-muted"
                      >
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            task.priority === 'high' && 'bg-destructive',
                            task.priority === 'medium' && 'bg-accent',
                            task.priority === 'low' && 'bg-success'
                          )}
                        />
                        <span className={cn(task.completed && 'line-through opacity-60')}>
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
