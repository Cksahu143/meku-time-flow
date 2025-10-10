import React from 'react';
import { Calendar, Clock, ListTodo, Timer, Moon, Sun, Palette, LogOut } from 'lucide-react';
import { ViewType } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { InvitationNotifications } from '@/components/InvitationNotifications';
import { ProfileSettings } from '@/components/ProfileSettings';
import { MusicPlayer } from '@/components/MusicPlayer';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const navItems = [
    { id: 'timetable' as ViewType, label: 'Timetable', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
    { id: 'todo' as ViewType, label: 'To-Do List', icon: ListTodo },
    { id: 'pomodoro' as ViewType, label: 'Pomodoro', icon: Timer },
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to sign out',
      });
    } else {
      navigate('/auth');
    }
  };

  return (
    <aside className="w-60 h-screen bg-card border-r border-border flex flex-col shadow-md overflow-hidden">
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
              EducationAssist
            </h1>
            <p className="text-xs text-muted-foreground">School Planner</p>
          </div>
        </div>
        <div className="flex gap-1 justify-end">
          <InvitationNotifications />
          <ProfileSettings />
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:scale-105 active:scale-95',
                isActive
                  ? 'bg-gradient-primary text-primary-foreground shadow-md'
                  : 'text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2 flex-shrink-0">
        <div className="flex gap-1">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setTheme('light')}
            className="flex-1"
          >
            <Sun className="w-4 h-4" />
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setTheme('dark')}
            className="flex-1"
          >
            <Moon className="w-4 h-4" />
          </Button>
          <Button
            variant={theme === 'pastel' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setTheme('pastel')}
            className="flex-1"
          >
            <Palette className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <MusicPlayer />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex-1"
          >
            <LogOut className="w-4 h-4 mr-1" />
            <span className="text-xs">Sign Out</span>
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          © 2025 EducationAssist
        </div>
      </div>
    </aside>
  );
}
