import React from 'react';
import { Calendar, Clock, ListTodo, Timer, Moon, Sun, LogOut } from 'lucide-react';
import { ViewType } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { InvitationNotifications } from '@/components/InvitationNotifications';
import { ProfileSettings } from '@/components/ProfileSettings';

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
    <aside className="w-60 h-screen bg-card border-r border-border flex flex-col shadow-md">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              EducationAssist
            </h1>
            <p className="text-sm text-muted-foreground mt-1">School Planner</p>
          </div>
          <div className="flex gap-1">
            <InvitationNotifications />
            <ProfileSettings />
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:scale-105 active:scale-95',
                isActive
                  ? 'bg-gradient-primary text-primary-foreground shadow-md'
                  : 'text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 mr-2" />
          ) : (
            <Moon className="w-4 h-4 mr-2" />
          )}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
        <div className="text-xs text-muted-foreground text-center pt-2">
          © 2025 EducationAssist
        </div>
      </div>
    </aside>
  );
}
