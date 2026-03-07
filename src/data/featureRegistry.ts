/**
 * Feature Registry
 * Central registry of all app features with metadata for search, navigation, and detail pages.
 * Each feature includes: id, label, description, icon name, view target, keywords, and detailed guide.
 */

import {
  LayoutDashboard, Clock, Calendar, ListTodo, Timer, MessageSquare,
  BookOpen, Mic, Megaphone, UserCheck, GraduationCap, BarChart3,
  Shield, Building, Settings2, AlertCircle, Bell, Users, Music,
  Share2, UserPlus, Search, HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { ViewType } from '@/types';

export interface FeatureItem {
  /** Unique feature identifier */
  id: string;
  /** Display label */
  label: string;
  /** Short one-line description */
  description: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** The sidebar view this navigates to (if applicable) */
  viewTarget?: ViewType;
  /** External route (if not a sidebar view) */
  route?: string;
  /** Search keywords for fuzzy matching */
  keywords: string[];
  /** Category grouping */
  category: 'core' | 'collaboration' | 'admin' | 'utility';
  /** Detailed feature guide shown on the detail page */
  guide: {
    overview: string;
    steps: string[];
    tips: string[];
  };
}

export const featureRegistry: FeatureItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Your personal command center with stats, quick actions, and recent activity',
    icon: LayoutDashboard,
    viewTarget: 'dashboard',
    keywords: ['dashboard', 'home', 'overview', 'stats', 'activity', 'quick actions', 'widgets'],
    category: 'core',
    guide: {
      overview: 'The Dashboard is your central hub showing personalized statistics, quick-access actions, and recent activity. It adapts to your role — students see upcoming tasks and exams, teachers see class summaries, and admins get platform-wide insights.',
      steps: [
        'View your personalized stats cards showing tasks completed, groups joined, and more',
        'Use Quick Actions to jump directly to creating tasks, starting a Pomodoro, or opening chat',
        'Check the Recent Activity feed to see what\'s happened across your groups and chats',
        'Review your permissions panel to understand your current access level',
      ],
      tips: [
        'The dashboard updates in real-time — no need to refresh',
        'Stats cards animate on load for a delightful experience',
        'Quick Actions are the fastest way to start common workflows',
      ],
    },
  },
  {
    id: 'timetable',
    label: 'Timetable',
    description: 'Manage your weekly class schedule with drag-and-drop periods',
    icon: Clock,
    viewTarget: 'timetable',
    keywords: ['timetable', 'schedule', 'class', 'period', 'weekly', 'time', 'lesson', 'drag drop'],
    category: 'core',
    guide: {
      overview: 'The Timetable lets you create and manage your weekly class schedule. Add periods with subjects, teachers, and rooms. Share your timetable with classmates for easy coordination.',
      steps: [
        'Click "Add Period" to create a new class slot',
        'Fill in the subject, teacher, room, and time',
        'Drag and drop periods to rearrange your schedule',
        'Use the "Share Timetable" button to share with friends via email',
        'View shared timetables from classmates in the same panel',
      ],
      tips: [
        'Color-code subjects for quick visual scanning',
        'You can have multiple timetables for different semesters',
        'Shared timetables update automatically when the owner makes changes',
      ],
    },
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'View exams, tasks, and events on a monthly or weekly calendar',
    icon: Calendar,
    viewTarget: 'calendar',
    keywords: ['calendar', 'events', 'month', 'week', 'date', 'exam', 'schedule', 'planner'],
    category: 'core',
    guide: {
      overview: 'The Calendar provides a visual overview of all your exams, tasks, and events. Switch between month and week views to plan your time effectively.',
      steps: [
        'Navigate between months using the arrow buttons',
        'Click on any date to see events for that day',
        'Toggle between Month and Week views',
        'Color-coded dots indicate different event types (exams, tasks, etc.)',
        'Add exams directly from the calendar view',
      ],
      tips: [
        'Exams show as colored badges on their dates',
        'The current day is always highlighted',
        'Week view gives you a more detailed hour-by-hour breakdown',
      ],
    },
  },
  {
    id: 'todo',
    label: 'To-Do List',
    description: 'Create, manage, and track your tasks with priorities and filters',
    icon: ListTodo,
    viewTarget: 'todo',
    keywords: ['todo', 'task', 'checklist', 'priority', 'completed', 'pending', 'list', 'organize'],
    category: 'core',
    guide: {
      overview: 'The To-Do List helps you stay organized with a powerful task management system. Set priorities, mark tasks complete, and filter by status to focus on what matters.',
      steps: [
        'Click "Add Task" to create a new task',
        'Set a priority level: Low, Medium, or High',
        'Check off tasks when completed',
        'Use filters to view All, Active, or Completed tasks',
        'Edit or delete tasks using the action buttons',
      ],
      tips: [
        'High-priority tasks are highlighted in red for visibility',
        'Completed tasks can be filtered out to reduce clutter',
        'Link tasks to timetable periods for context',
      ],
    },
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro Timer',
    description: 'Boost productivity with timed focus sessions and break intervals',
    icon: Timer,
    viewTarget: 'pomodoro',
    keywords: ['pomodoro', 'timer', 'focus', 'break', 'productivity', 'study', 'work session', 'concentration'],
    category: 'core',
    guide: {
      overview: 'The Pomodoro Timer uses the proven Pomodoro Technique to help you maintain focus. Work in 25-minute sprints followed by short breaks, with a longer break after every 4 sessions.',
      steps: [
        'Click "Start" to begin a 25-minute focus session',
        'Work until the timer rings — avoid distractions!',
        'Take a 5-minute short break when prompted',
        'After 4 sessions, enjoy a 15-minute long break',
        'Customize durations in the settings panel',
      ],
      tips: [
        'Pair with the Music Player for ambient study sounds',
        'The timer continues even if you switch views',
        'Track your daily session count to build consistency',
      ],
    },
  },
  {
    id: 'groups',
    label: 'Study Chat',
    description: 'Group messaging and direct chats with file sharing, voice messages, and more',
    icon: MessageSquare,
    viewTarget: 'groups',
    keywords: ['chat', 'group', 'message', 'direct', 'conversation', 'whatsapp', 'voice', 'file', 'share', 'dm', 'private chat', 'study group'],
    category: 'collaboration',
    guide: {
      overview: 'Study Chat is your WhatsApp-style messaging hub. Create study groups, have private 1-on-1 conversations, share files, send voice messages, and collaborate seamlessly — all within EDAS.',
      steps: [
        'Switch between "Groups" and "Chats" tabs at the top',
        'Create a new group by clicking the "+" button',
        'Invite members by searching their username or email',
        'Send text messages, images, files, or voice recordings',
        'Reply to specific messages, forward messages, or react with emojis',
        'Pin important messages for easy access later',
        'Use @mentions to notify specific group members',
      ],
      tips: [
        'Drag and drop files directly into the chat to share them',
        'The chat supports image previews, PDF viewing, and link previews',
        'Online status indicators show who\'s currently active',
        'Use the resizable panel divider to adjust sidebar width',
      ],
    },
  },
  {
    id: 'resources',
    label: 'Resources',
    description: 'Upload, organize, and browse study materials like PDFs, notes, and links',
    icon: BookOpen,
    viewTarget: 'resources',
    keywords: ['resources', 'pdf', 'notes', 'study material', 'upload', 'document', 'link', 'textbook', 'file', 'library'],
    category: 'core',
    guide: {
      overview: 'Resources is your personal study library. Upload PDFs, save links, write notes, and organize everything by subject, category, and tags for instant access.',
      steps: [
        'Click "Add Resource" to upload a new file or save a link',
        'Choose a type: PDF, Link, Video, Document, or Text',
        'Organize with subjects, categories, and tags',
        'Use the search and filter bar to find materials quickly',
        'Mark favorites with the star icon for quick access',
        'View PDFs directly in the built-in viewer',
      ],
      tips: [
        'Use tags to create cross-subject collections',
        'The "AI Transcription Notes" category works great with the Transcribe feature',
        'Favorite resources appear at the top of your list',
      ],
    },
  },
  {
    id: 'transcribe',
    label: 'Transcribe',
    description: 'Convert audio recordings to text using AI-powered transcription',
    icon: Mic,
    viewTarget: 'transcribe',
    keywords: ['transcribe', 'audio', 'voice', 'speech to text', 'recording', 'AI', 'lecture', 'dictation', 'note taking'],
    category: 'core',
    guide: {
      overview: 'Transcribe uses AI to convert audio recordings into text. Record lectures, meetings, or study notes, and get accurate transcriptions you can save to your Resources library.',
      steps: [
        'Record audio directly in the app or upload an audio file',
        'Click "Transcribe" to start the AI conversion',
        'Review and edit the generated transcription',
        'Save the result as a resource in your library',
      ],
      tips: [
        'Speak clearly for the best transcription accuracy',
        'Longer recordings may take a moment to process',
        'Saved transcriptions are automatically categorized as "AI Transcription Notes"',
      ],
    },
  },
  {
    id: 'about',
    label: 'About EDAS',
    description: 'Learn about the platform, its mission, and download the features document',
    icon: AlertCircle,
    viewTarget: 'about',
    keywords: ['about', 'info', 'mission', 'features document', 'download', 'platform', 'education assist'],
    category: 'utility',
    guide: {
      overview: 'The About page shares the EDAS mission and the educational problems it solves. You can also download a comprehensive features document summarizing all platform capabilities.',
      steps: [
        'Read about the platform\'s purpose and impact',
        'Click "Download Features Document" to get a summary file',
        'Share the document with your institution to advocate for EDAS adoption',
      ],
      tips: [
        'The features document is generated on-the-fly as a .txt file',
        'Great for showing teachers or administrators what EDAS offers',
      ],
    },
  },
  {
    id: 'notifications',
    label: 'Notification Hub',
    description: 'View all your alerts, mentions, follows, reactions, and invitations in one place',
    icon: Bell,
    route: '/notifhub',
    keywords: ['notification', 'alert', 'mention', 'follow', 'reaction', 'invitation', 'bell', 'updates'],
    category: 'utility',
    guide: {
      overview: 'The Notification Hub aggregates all your platform alerts. See mentions from chats, new followers, group invitations, timetable shares, and post reactions — all in a single, filterable feed.',
      steps: [
        'Click the bell icon in the header to see pending invitations',
        'Visit the Notification Hub for a full history of alerts',
        'Filter by type: mentions, replies, follows, reactions, or invitations',
        'Enable browser notifications for alerts when you\'re away from the tab',
        'Set quiet hours to pause notifications during study time',
      ],
      tips: [
        'Unread notifications show a badge count on the bell icon',
        'You can customize which notification types you receive in settings',
        'Browser notifications require permission — enable them for the best experience',
      ],
    },
  },
  {
    id: 'active-users',
    label: 'Active Users',
    description: 'See who\'s online and start private conversations',
    icon: Users,
    route: '/active-users',
    keywords: ['active users', 'online', 'people', 'classmates', 'start chat', 'direct message'],
    category: 'collaboration',
    guide: {
      overview: 'The Active Users page shows all registered users with their online status. Click on any user to view their profile or start a private chat.',
      steps: [
        'Browse the list of all users on the platform',
        'See who\'s currently online via green status indicators',
        'Click on a user to view their profile',
        'Select "Create Chat" to start a private 1-on-1 conversation',
        'Follow users to see their posts in your feed',
      ],
      tips: [
        'Recently active users appear at the top',
        'The search bar filters users by name or username',
        'You can view any public profile without following them',
      ],
    },
  },
  {
    id: 'music-player',
    label: 'Music Player',
    description: 'Play ambient study sounds and calm music while you work',
    icon: Music,
    keywords: ['music', 'player', 'ambient', 'sounds', 'nature', 'piano', 'study music', 'focus', 'relax'],
    category: 'utility',
    guide: {
      overview: 'The Music Player provides ambient sounds to help you concentrate. Choose from nature sounds, calm piano, and more — perfect for pairing with Pomodoro sessions.',
      steps: [
        'Click the music icon in the sidebar to open the player',
        'Browse available tracks: nature sounds, calm piano, etc.',
        'Use play/pause and skip controls',
        'Adjust volume to your preference',
      ],
      tips: [
        'Music continues playing even when you switch between views',
        'Pair with the Pomodoro Timer for an optimal study session',
        'Lower the volume for background ambiance that won\'t distract',
      ],
    },
  },
  {
    id: 'profile',
    label: 'Profile & Settings',
    description: 'Customize your profile, avatar, theme, and notification preferences',
    icon: UserPlus,
    route: '/profile',
    keywords: ['profile', 'settings', 'avatar', 'theme', 'dark mode', 'light mode', 'edit profile', 'bio', 'username', 'photo'],
    category: 'utility',
    guide: {
      overview: 'Your profile is your identity on EDAS. Customize your display name, avatar, header image, bio, and privacy settings. Choose between light, dark, OLED, and pastel themes.',
      steps: [
        'Click your avatar in the top-right to open the user menu',
        'Select "Edit Profile" to update your information',
        'Upload a custom avatar and profile header image',
        'Write a bio to tell others about yourself',
        'Change your theme in the sidebar (Light, Dark, OLED, Pastel)',
        'Set your profile to public or private',
      ],
      tips: [
        'A complete profile helps classmates recognize and connect with you',
        'The OLED theme uses true black — great for AMOLED screens',
        'Your theme preference syncs across all your devices',
      ],
    },
  },
  {
    id: 'share-timetable',
    label: 'Share Timetable',
    description: 'Share your class schedule with friends via email invitation',
    icon: Share2,
    viewTarget: 'timetable',
    keywords: ['share', 'timetable', 'invite', 'email', 'schedule', 'send', 'classmate'],
    category: 'collaboration',
    guide: {
      overview: 'Share your timetable with classmates so they can see your schedule. Perfect for coordinating study sessions and group projects.',
      steps: [
        'Go to the Timetable view',
        'Click the "Share Timetable" button',
        'Enter the email of the person you want to share with',
        'They receive a notification to accept the shared timetable',
        'Accepted timetables appear in their Timetable view',
      ],
      tips: [
        'Changes to your timetable are automatically reflected for everyone you\'ve shared with',
        'You can revoke sharing access at any time',
      ],
    },
  },
  // Admin features
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'Post and manage school-wide announcements with priority levels',
    icon: Megaphone,
    viewTarget: 'announcements',
    keywords: ['announcement', 'notice', 'broadcast', 'news', 'update', 'school', 'important', 'pin'],
    category: 'admin',
    guide: {
      overview: 'Announcements lets teachers and admins broadcast important messages to the entire school or specific audiences. Pin critical notices and set expiry dates.',
      steps: [
        'Click "New Announcement" to create a post',
        'Set a title, content, priority, and target audience',
        'Pin important announcements to keep them at the top',
        'Set an optional expiry date for time-sensitive notices',
      ],
      tips: [
        'High-priority announcements are highlighted for visibility',
        'Expired announcements are automatically hidden',
        'Only teachers, school admins, and platform admins can post',
      ],
    },
  },
  {
    id: 'attendance',
    label: 'Attendance',
    description: 'Mark and track student attendance with notes and reports',
    icon: UserCheck,
    viewTarget: 'attendance',
    keywords: ['attendance', 'present', 'absent', 'mark', 'student', 'roll call', 'tracking'],
    category: 'admin',
    guide: {
      overview: 'The Attendance module lets teachers and admins mark daily student attendance. Track presence, absence, and late arrivals with optional notes.',
      steps: [
        'Select the class and date',
        'Mark each student as Present, Absent, or Late',
        'Add optional notes for individual students',
        'Save the attendance record',
        'View historical attendance data and reports',
      ],
      tips: [
        'Attendance records cannot be modified after 24 hours without admin approval',
        'The system auto-highlights students with low attendance rates',
      ],
    },
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'View platform usage statistics, charts, and reports',
    icon: BarChart3,
    viewTarget: 'analytics',
    keywords: ['analytics', 'statistics', 'chart', 'report', 'data', 'usage', 'metrics', 'insights'],
    category: 'admin',
    guide: {
      overview: 'Analytics provides visual insights into platform usage. View charts showing active users, engagement trends, and feature adoption rates.',
      steps: [
        'View the analytics dashboard with overview statistics',
        'Explore charts showing user activity over time',
        'Filter data by date range or user group',
        'Export reports for institutional records',
      ],
      tips: [
        'Analytics data refreshes every 30 seconds',
        'Hover over chart data points for detailed tooltips',
        'Only school admins and platform admins can access analytics',
      ],
    },
  },
  {
    id: 'role-management',
    label: 'Role Management',
    description: 'Assign and manage user roles and permissions across the platform',
    icon: Shield,
    viewTarget: 'role-management',
    keywords: ['role', 'permission', 'admin', 'user management', 'access control', 'RBAC', 'assign role'],
    category: 'admin',
    guide: {
      overview: 'Role Management lets admins assign roles (Student, Teacher, School Admin, Platform Admin) and manage fine-grained permissions for each role.',
      steps: [
        'View all users and their current roles',
        'Click on a user to change their role',
        'Review role permissions in the permissions panel',
        'Create custom permission configurations if needed',
      ],
      tips: [
        'Role changes take effect immediately',
        'Be careful when assigning admin roles — they have full access',
        'The permissions panel shows exactly what each role can do',
      ],
    },
  },
  {
    id: 'classes-management',
    label: 'Classes Management',
    description: 'Create and manage classes, sections, subjects, and student enrollment',
    icon: GraduationCap,
    viewTarget: 'classes-management',
    keywords: ['class', 'section', 'subject', 'enrollment', 'student', 'teacher', 'grade', 'academic year'],
    category: 'admin',
    guide: {
      overview: 'Classes Management is the administrative hub for creating classes, assigning teachers, enrolling students, and managing subjects and sections.',
      steps: [
        'Create a new class with grade level, section, and academic year',
        'Assign a class teacher to the class',
        'Add subjects with their respective teachers',
        'Enroll students individually or via bulk import',
        'Manage student roll numbers and enrollment status',
      ],
      tips: [
        'Use bulk import (XLSX) to enroll many students at once',
        'Each class can have its own subject-teacher mapping',
        'Promoted students can be tracked across academic years',
      ],
    },
  },
  {
    id: 'schools-management',
    label: 'Schools Management',
    description: 'Manage schools, subscription tiers, and institutional settings',
    icon: Building,
    viewTarget: 'schools-management',
    keywords: ['school', 'institution', 'subscription', 'manage school', 'organization', 'tenant'],
    category: 'admin',
    guide: {
      overview: 'Schools Management is for platform and school admins to configure institutional settings, manage subscriptions, and control feature access.',
      steps: [
        'View all registered schools on the platform',
        'Edit school details: name, code, address, contact info',
        'Manage subscription tier and feature access',
        'Set student and teacher capacity limits',
      ],
      tips: [
        'School codes must be unique across the platform',
        'Feature access can be toggled per school based on subscription',
        'School admins can only see their own school',
      ],
    },
  },
  {
    id: 'feature-toggles',
    label: 'Feature Toggles',
    description: 'Enable or disable platform features for specific schools or globally',
    icon: Settings2,
    viewTarget: 'feature-toggles',
    keywords: ['feature', 'toggle', 'enable', 'disable', 'switch', 'configuration', 'settings'],
    category: 'admin',
    guide: {
      overview: 'Feature Toggles lets platform admins enable or disable specific features globally or per school. Useful for gradual rollouts and A/B testing.',
      steps: [
        'View all available feature flags',
        'Toggle features on/off globally',
        'Override settings for specific schools',
        'Save changes — they take effect immediately',
      ],
      tips: [
        'Use feature toggles for safe rollouts of new features',
        'Disabled features are hidden from the sidebar and search',
        'Only platform admins can access this view',
      ],
    },
  },
];

/**
 * Search features by query string, matching against label, description, and keywords.
 * Returns features sorted by relevance.
 */
export function searchFeatures(query: string): FeatureItem[] {
  if (!query.trim()) return [];
  
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  return featureRegistry
    .map((feature) => {
      let score = 0;
      const label = feature.label.toLowerCase();
      const desc = feature.description.toLowerCase();
      const kws = feature.keywords.join(' ').toLowerCase();

      // Exact label match — highest score
      if (label === q) score += 100;
      else if (label.startsWith(q)) score += 60;
      else if (label.includes(q)) score += 40;

      // Word matches in keywords
      for (const word of words) {
        if (kws.includes(word)) score += 20;
        if (desc.includes(word)) score += 10;
      }

      return { feature, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ feature }) => feature);
}
