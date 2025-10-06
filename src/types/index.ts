export interface Period {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher?: string;
  room?: string;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  linkedPeriodId?: string;
}

export type ViewType = 'timetable' | 'calendar' | 'todo';
export type CalendarViewType = 'month' | 'week';
