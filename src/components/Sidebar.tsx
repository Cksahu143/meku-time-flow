import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  ListTodo, 
  Timer, 
  Moon, 
  Sun, 
  Palette, 
  LogOut, 
  Users, 
  MessageSquare, 
  HelpCircle, 
  AlertCircle, 
  BookOpen,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';
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
import { HelpDialog } from '@/components/HelpDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ avatar_url: string | null; display_name: string | null; username: string | null; is_public: boolean | null } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadProfile();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('sidebar-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            setProfile(prev => ({
              ...prev,
              avatar_url: payload.new.avatar_url,
              display_name: payload.new.display_name,
              username: payload.new.username,
              is_public: payload.new.is_public,
            }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, username, is_public')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };
  
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timetable' as ViewType, label: 'Timetable', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
    { id: 'todo' as ViewType, label: 'To-Do List', icon: ListTodo },
    { id: 'pomodoro' as ViewType, label: 'Pomodoro', icon: Timer },
    { id: 'groups' as ViewType, label: 'Groups', icon: MessageSquare, showWarning: !profile?.is_public },
    { id: 'resources' as ViewType, label: 'Resources', icon: BookOpen },
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
    <aside className="w-60 h-screen bg-card/80 backdrop-blur-xl border-r border-border/50 flex flex-col shadow-xl overflow-hidden">
      {/* Header */}
      <motion.div 
        className="p-4 border-b border-border/50 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: 'spring' }}>
            <Avatar className="h-12 w-12 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all" onClick={() => document.getElementById('avatar-upload')?.click()}>
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
                EDAS
              </h1>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground">Education Assistant</p>
          </div>
        </div>
        <div className="flex gap-1 justify-end flex-wrap">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(true)}
              title="Help & Guide"
              className="hover:bg-primary/10"
            >
              <HelpCircle className="h-5 w-5 text-primary" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/active-users')}
              title="View Active Users"
              className="hover:bg-primary/10"
            >
              <Users className="h-5 w-5" />
            </Button>
          </motion.div>
          <InvitationNotifications />
          <ProfileSettings />
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                isActive
                  ? 'bg-gradient-primary text-primary-foreground shadow-lg'
                  : 'text-foreground hover:bg-primary/10',
                item.showWarning && !isActive && 'opacity-70'
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: isActive ? 0 : 5 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              <div className="relative">
                <motion.div
                  whileHover={{ rotate: isActive ? 0 : 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Icon className={cn("w-4 h-4", item.showWarning && !isActive && "text-muted-foreground")} />
                </motion.div>
                {item.showWarning && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>
              <span className={cn("font-medium text-sm", item.showWarning && !isActive && "text-muted-foreground")}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <motion.div 
        className="p-3 border-t border-border/50 space-y-2 flex-shrink-0 bg-card/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex gap-1">
          {[
            { theme: 'light' as const, icon: Sun },
            { theme: 'dark' as const, icon: Moon },
            { theme: 'pastel' as const, icon: Palette },
          ].map(({ theme: t, icon: ThemeIcon }) => (
            <motion.div key={t} className="flex-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={theme === t ? 'default' : 'outline'}
                size="icon"
                onClick={() => setTheme(t)}
                className="w-full"
              >
                <ThemeIcon className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
        <div className="flex gap-1">
          <MusicPlayer />
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full gap-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs">Sign Out</span>
            </Button>
          </motion.div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          © 2025 EDAS
        </p>
      </motion.div>
      
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </aside>
  );
}
