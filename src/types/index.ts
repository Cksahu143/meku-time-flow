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

export type ViewType = 'dashboard' | 'timetable' | 'calendar' | 'todo' | 'pomodoro' | 'groups' | 'resources' | 'transcribe' | 'role-management' | 'schools-management' | 'announcements' | 'attendance' | 'analytics' | 'feature-toggles' | 'classes-management';

export interface Resource {
  id: string;
  title: string;
  subject: string;
  type: 'pdf' | 'link' | 'video' | 'document' | 'text';
  description: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  content?: string;
  category?: string;
  chapter?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const RESOURCE_CATEGORIES = [
  'Notes',
  'Textbooks',
  'Practice Problems',
  'Study Guides',
  'Lectures',
  'Reference',
  'AI Transcription Notes',
  'Other'
] as const;

export type ResourceCategory = typeof RESOURCE_CATEGORIES[number];

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
  reply_to_message_id?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
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
  reply_to_message_id?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
}

export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_public?: boolean;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  start_date: string;
  start_time: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// RBAC Types
export type AppRole = 'student' | 'teacher' | 'school_admin' | 'platform_admin';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  school_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: AppRole;
  permission_id: string;
  created_at: string;
}