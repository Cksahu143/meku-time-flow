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

export type ViewType = 'timetable' | 'calendar' | 'todo' | 'pomodoro' | 'groups';
export type CalendarViewType = 'month' | 'week';

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  voice_url?: string;
  voice_duration?: number;
  edited_at?: string;
  is_deleted?: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string;
  is_deleted?: boolean;
  voice_url?: string;
  voice_duration?: number;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
}

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}
