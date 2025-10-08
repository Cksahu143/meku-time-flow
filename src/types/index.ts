export interface Period {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
  room?: string;
  type?: 'class' | 'short-break' | 'long-break';
}

export interface Task {
  id: string;
  title: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  linkedPeriodId?: string;
}

export type ViewType = 'timetable' | 'calendar' | 'todo' | 'pomodoro';
export type CalendarViewType = 'month' | 'week';

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}
