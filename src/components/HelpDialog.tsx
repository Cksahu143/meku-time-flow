import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  CheckSquare,
  Clock,
  Users,
  MessageSquare,
  Settings,
  UserPlus,
  Bell,
  Share2,
  Music,
  HelpCircle,
} from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog = ({ open, onOpenChange }: HelpDialogProps) => {
  const helpSections = [
    {
      icon: Calendar,
      title: 'Calendar',
      description: 'View and manage your schedule',
      steps: [
        'Click on any date to view events',
        'Navigate between months using arrow buttons',
        'Color-coded events show your activities at a glance',
      ],
    },
    {
      icon: CheckSquare,
      title: 'Tasks',
      description: 'Stay organized with your to-do list',
      steps: [
        'Click "Add Task" button to create a new task',
        'Check off tasks when completed',
        'Edit or delete tasks using the action buttons',
        'Filter tasks by status (all, active, completed)',
      ],
    },
    {
      icon: Clock,
      title: 'Pomodoro Timer',
      description: 'Boost productivity with focused work sessions',
      steps: [
        'Click "Start" to begin a 25-minute focus session',
        'Take a 5-minute break when the timer ends',
        'After 4 sessions, enjoy a longer 15-minute break',
        'Customize timer durations in settings',
      ],
    },
    {
      icon: Users,
      title: 'Groups',
      description: 'Collaborate with your team',
      steps: [
        'Click the "+" button in Groups tab to create a new group',
        'Add a group name, description, and profile picture',
        'Invite members by searching their username or email',
        'Click three dots to view group info, edit details, or remove members (host only)',
        'Search groups using the search bar when you have many',
        'Pin important messages by clicking the pin icon',
        'Use @mentions to notify specific members',
      ],
    },
    {
      icon: MessageSquare,
      title: 'Private Chats',
      description: 'One-on-one conversations',
      steps: [
        'Go to Active Users page and click on any user',
        'Select "Create Chat" to start a conversation',
        'View online status and last seen timestamps',
        'Reply to specific messages for context',
        'Forward messages to other chats or groups',
        'Drag and drop files to share attachments',
      ],
    },
    {
      icon: Share2,
      title: 'Share Timetable',
      description: 'Share your schedule with friends',
      steps: [
        'Click "Share Timetable" button',
        'Enter the email of the person you want to share with',
        'They will receive a notification to accept',
      ],
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Stay updated on all activities',
      steps: [
        'Click the bell icon to see pending invitations',
        'Visit the Notification Hub for all alerts',
        'Filter by type: mentions, replies, follows, reactions',
        'Enable browser notifications for alerts when away',
        'Set quiet hours to pause notifications',
      ],
    },
    {
      icon: UserPlus,
      title: 'Social Features',
      description: 'Connect with classmates',
      steps: [
        'Visit user profiles to see their posts and activity',
        'Follow users to stay updated on their posts',
        'View followers and following lists',
        'React to posts with likes',
        'Check the Activity tab for recent actions',
      ],
    },
    {
      icon: Settings,
      title: 'Profile & Themes',
      description: 'Customize your experience',
      steps: [
        'Click your profile picture to open settings',
        'Update your display name, username, and bio',
        'Upload a custom avatar and profile header',
        'Choose between light, dark, or pastel themes',
        'Customize notification preferences',
      ],
    },
    {
      icon: Music,
      title: 'Music Player',
      description: 'Enjoy music while you work',
      steps: [
        'Click the music icon to open the player',
        'Play, pause, and skip tracks',
        'Choose from nature sounds or calm piano',
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <HelpCircle className="h-6 w-6 text-primary" />
            How to Use This App
          </DialogTitle>
          <DialogDescription>
            A comprehensive guide to all features and functionality
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {helpSections.map((section, index) => (
              <div
                key={index}
                className="space-y-3 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>

                <ul className="ml-14 space-y-2">
                  {section.steps.map((step, stepIndex) => (
                    <li
                      key={stepIndex}
                      className="text-sm flex items-start gap-2"
                    >
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>

                {index < helpSections.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}

            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 animate-fade-in">
              <p className="text-sm">
                <strong>💡 Pro Tip:</strong> Use the resizable panel in Groups/Chats
                by dragging the divider to adjust the sidebar width for your comfort!
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
