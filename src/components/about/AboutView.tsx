import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Zap, BookOpen, Clock,
  MessageSquare, BarChart3, Shield, Mic, Timer,
  ArrowRight, Sparkles, Brain, Target, TrendingDown, TrendingUp,
  Download, FileText
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QATestingSection } from './QATestingSection';

interface AboutViewProps {
  onNavigate?: (view: string) => void;
}

const problems = [
  {
    icon: AlertTriangle,
    title: 'Fragmented Tools',
    description: 'Students juggle between 5+ apps for scheduling, notes, chat, tasks, and study timers — wasting time switching context.',
    stat: '5+',
    statLabel: 'apps replaced',
  },
  {
    icon: TrendingDown,
    title: 'Declining Engagement',
    description: 'Without centralized tracking, students lose motivation. Teachers lack visibility into who needs help.',
    stat: '40%',
    statLabel: 'drop-off rate',
  },
  {
    icon: Clock,
    title: 'Wasted Administrative Time',
    description: 'Manual attendance, scattered announcements, and disconnected grade books consume hours of teacher time weekly.',
    stat: '8hrs',
    statLabel: 'saved per week',
  },
  {
    icon: Shield,
    title: 'No Role-Based Access',
    description: 'Most student tools treat everyone the same. Schools need tiered access for students, teachers, and admins.',
    stat: '4',
    statLabel: 'role tiers',
  },
];

const solutions = [
  {
    icon: BookOpen,
    title: 'Unified Learning Hub',
    description: 'Timetables, resources, transcription, and study tools — all in one place.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: MessageSquare,
    title: 'Real-Time Collaboration',
    description: 'Group chats, direct messaging, file sharing, and voice messages for seamless teamwork.',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    icon: Timer,
    title: 'Productivity Suite',
    description: 'Pomodoro timer, to-do lists, and calendar integration to keep students focused.',
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: Mic,
    title: 'AI-Powered Transcription',
    description: 'Live lecture transcription turns spoken words into searchable, organized notes instantly.',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Actionable Analytics',
    description: 'Dashboards for admins and teachers to track attendance, engagement, and performance trends.',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade RBAC',
    description: 'Granular permissions for students, teachers, school admins, and platform admins.',
    color: 'bg-red-500/10 text-red-600',
  },
];

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } } },
};

const featuresDocContent = `
=====================================
  EDAS — Education Assist
  Complete Features & Capabilities
=====================================

ABOUT EDAS
----------
EDAS (Education Assist) is an all-in-one educational platform that unifies
scheduling, collaboration, productivity, and administration tools into a
single intelligent system for students, teachers, and administrators.


PROBLEMS EDAS ELIMINATES
-------------------------
1. Fragmented Tools — Replaces 5+ disconnected apps (scheduling, notes,
   chat, tasks, timers) with one unified platform.

2. Declining Student Engagement — Centralized tracking and analytics help
   teachers identify students who need support before they fall behind.

3. Wasted Administrative Time — Automates attendance, centralizes
   announcements, and streamlines grade management — saving up to 8 hours
   per week for educators.

4. Lack of Role-Based Access — Provides 4-tier access control (Student,
   Teacher, School Admin, Platform Admin) with granular permissions.


CORE FEATURES
--------------

TIMETABLE MANAGEMENT
  - Create and manage class timetables
  - Share timetables with classmates via invitations
  - Color-coded subjects and time slots
  - Support for breaks (short & long)

CALENDAR & SCHEDULING
  - Month and week views
  - Exam tracking with subject tags
  - Event management and reminders
  - Integration with timetable data

TO-DO LIST & TASK MANAGEMENT
  - Create tasks with priority levels (Low, Medium, High)
  - Link tasks to timetable periods
  - Track completion progress
  - Task summary dashboard

POMODORO TIMER
  - Customizable work/break durations
  - Session tracking with long break intervals
  - Focus mode for distraction-free study

STUDY CHAT & COLLABORATION
  - Group chats with file sharing
  - Direct messaging between users
  - Voice messages and voice recording
  - Message reactions, replies, and forwarding
  - Pinned messages for important content
  - Typing indicators and read receipts
  - Online status tracking
  - Drag-and-drop file uploads
  - Link previews with thumbnails
  - Photo collages for multiple images

RESOURCE LIBRARY
  - Upload and organize study materials
  - Support for PDFs, links, videos, and documents
  - Categories: Notes, Textbooks, Practice Problems, Study Guides,
    Lectures, Reference, AI Transcription Notes
  - In-app PDF viewer
  - Favorites and tag-based filtering

AI-POWERED TRANSCRIPTION
  - Live lecture transcription using speech recognition
  - Automatic conversion of spoken words to searchable notes
  - Save transcriptions directly to the Resource Library

STUDY MUSIC PLAYER
  - Built-in ambient music for focus
  - Tracks: Lofi Study, Nature Sounds, Calm Piano
  - Volume control and track switching


ADMINISTRATION FEATURES
------------------------

ROLE MANAGEMENT (RBAC)
  - 4 role tiers: Student, Teacher, School Admin, Platform Admin
  - Granular permission system with 15+ permission flags
  - Role-based view access control
  - Visual role badges throughout the interface

SCHOOL MANAGEMENT
  - Multi-school support
  - School profiles with logo, contact info, and address
  - Subscription tiers (Free, Basic, Premium)
  - Feature toggles per school

ANNOUNCEMENTS
  - School-wide and targeted announcements
  - Priority levels (Normal, Important, Urgent)
  - Pin important announcements
  - Audience targeting (All, Students, Teachers)

ATTENDANCE TRACKING
  - Mark attendance by class and period
  - Status: Present, Absent, Late, Excused
  - Historical attendance data

ANALYTICS DASHBOARD
  - Activity overview charts
  - Student engagement metrics
  - Attendance trends

CLASS MANAGEMENT
  - Create and manage classes with grade levels
  - Subject management with periods-per-week tracking
  - Student enrollment and roll numbers

FEATURE TOGGLES
  - Enable/disable features per school
  - Platform-wide feature management


USER EXPERIENCE
----------------

USER PROFILES
  - Customizable display name and username
  - Profile photo and header image
  - Public/private profile toggle
  - Activity feed and follow system

NOTIFICATIONS
  - Real-time notification system
  - Browser push notifications
  - Notification preferences

THEMING
  - Light, Dark, and Pastel themes
  - Consistent design system

AUTHENTICATION & SECURITY
  - Email-based signup and login
  - Password reset flow
  - Row-Level Security on all database tables


=====================================
  EDAS — Education Assist
  All rights reserved.
=====================================
`.trim();

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  const handleDownloadFeatures = useCallback(() => {
    const blob = new Blob([featuresDocContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EDAS-Features-Document.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-12">
      {/* Hero */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="h-4 w-4" />
          About EDAS
        </motion.div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          Education, <span className="text-primary">Simplified.</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          EDAS (Education Assist) eliminates the chaos of fragmented educational tools 
          by unifying everything students, teachers, and administrators need into one intelligent platform.
        </p>
      </motion.div>

      {/* Problems Section */}
      <motion.section
        className="space-y-6"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-destructive/10">
            <Target className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">The Problems We Eliminate</h2>
            <p className="text-sm text-muted-foreground">Challenges that hold education back</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {problems.map((problem) => (
            <motion.div key={problem.title} variants={stagger.item}>
              <Card className="border-border/40 hover:border-destructive/30 transition-all group h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-destructive/10 flex-shrink-0 group-hover:bg-destructive/15 transition-colors">
                      <problem.icon className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-foreground">{problem.title}</h3>
                        <Badge variant="outline" className="text-xs border-destructive/30 text-destructive flex-shrink-0">
                          {problem.stat} {problem.statLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{problem.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Divider with arrow */}
      <motion.div
        className="flex items-center justify-center gap-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="h-px flex-1 bg-border" />
        <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
          </motion.div>
        </div>
        <div className="h-px flex-1 bg-border" />
      </motion.div>

      {/* Solutions Section */}
      <motion.section
        className="space-y-6"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">How EDAS Solves It</h2>
            <p className="text-sm text-muted-foreground">One platform, every need covered</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {solutions.map((solution) => (
            <motion.div key={solution.title} variants={stagger.item}>
              <Card className="border-border/40 hover:border-primary/30 hover:shadow-sm transition-all group h-full">
                <CardContent className="p-5">
                  <div className={`p-2.5 rounded-xl ${solution.color} w-fit mb-3 group-hover:scale-105 transition-transform`}>
                    <solution.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{solution.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{solution.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Download Features Document */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <Card className="border-border/40 border-dashed">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="p-4 rounded-2xl bg-primary/10 flex-shrink-0">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-foreground mb-1">Features Document</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Download a comprehensive document listing all EDAS features, capabilities, 
                  administration tools, and technical specifications.
                </p>
              </div>
              <Button
                size="lg"
                className="gap-2 flex-shrink-0"
                onClick={handleDownloadFeatures}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Impact Banner */}
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 md:p-10">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { value: '10x', label: 'Faster Workflow', icon: TrendingUp },
              { value: '1', label: 'Unified Platform', icon: Brain },
              { value: '100%', label: 'Role-Based Security', icon: Shield },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="space-y-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <stat.icon className="h-6 w-6 text-primary-foreground/70 mx-auto" />
                <div className="text-3xl md:text-4xl font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-sm text-primary-foreground/80 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      {onNavigate && (
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-muted-foreground text-sm">Ready to explore?</p>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => onNavigate('dashboard')}
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};
