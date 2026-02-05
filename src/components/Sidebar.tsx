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
  Sparkles,
  Mic,
  BookOpenCheck,
  Lock,
  Shield,
  Building
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
import { RoleBadge } from '@/components/RoleBadge';
import { useRBACContext } from '@/contexts/RBACContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canAccessView, hasPermission, userRole, canManageUsers } = useRBACContext();
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

  // Check if user can manage roles (platform admin or school admin)
  const showRoleManagement = canManageUsers() || hasPermission('can_change_any_role') || userRole === 'platform_admin' || userRole === 'school_admin';
  const showSchoolsManagement = userRole === 'platform_admin' || hasPermission('can_manage_schools');
  
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'timetable' as ViewType, label: 'Timetable', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
    { id: 'todo' as ViewType, label: 'To-Do List', icon: ListTodo },
    { id: 'pomodoro' as ViewType, label: 'Pomodoro', icon: Timer },
    { id: 'groups' as ViewType, label: 'Study Chat', icon: MessageSquare, showWarning: !profile?.is_public },
    { id: 'resources' as ViewType, label: 'Resources', icon: BookOpen },
    { id: 'transcribe' as ViewType, label: 'Transcribe', icon: Mic },
    ...(showRoleManagement ? [{ id: 'role-management' as ViewType, label: 'Role Management', icon: Shield }] : []),
    ...(showSchoolsManagement ? [{ id: 'schools-management' as ViewType, label: 'Schools', icon: Building }] : []),
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
    <aside className="w-64 h-screen bg-card border-r border-border/50 flex flex-col shadow-lg overflow-hidden">
      {/* Header - Cohen EDAS Logo */}
      <motion.div 
        className="p-5 border-b border-border/30 flex-shrink-0 bg-gradient-to-b from-primary/5 to-transparent"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md btn-glow">
              <BookOpenCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 h-3 w-3 bg-success rounded-full border-2 border-card"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-gradient-blue">
                Cohen
              </h1>
              <span className="text-xl font-bold text-foreground">- EDAS</span>
            </div>
            <p className="text-xs text-muted-foreground">AI Education Assistant</p>
          </div>
        </div>

        {/* User Avatar & Actions */}
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ x: 2 }}
          >
            <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all" onClick={() => document.getElementById('avatar-upload')?.click()}>
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs">
              <p className="font-medium text-foreground truncate max-w-[100px]">
                {profile?.display_name || profile?.username || 'User'}
              </p>
              <div className="mt-0.5">
                <RoleBadge size="sm" showIcon={true} animated />
              </div>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHelp(true)}
                title="Help & Guide"
                className="h-8 w-8 hover:bg-primary/10 border border-transparent hover:border-primary/20"
              >
                <HelpCircle className="h-4 w-4 text-primary" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/active-users')}
                title="View Active Users"
                className="h-8 w-8 hover:bg-primary/10 border border-transparent hover:border-primary/20"
              >
                <Users className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <InvitationNotifications />
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <ProfileSettings />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const hasAccess = canAccessView(item.id);

          const button = (
            <motion.button
              key={item.id}
              onClick={() => hasAccess && onViewChange(item.id)}
              disabled={!hasAccess}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md btn-glow'
                  : 'text-foreground hover:bg-secondary/80',
                item.showWarning && !isActive && 'opacity-70',
                !hasAccess && 'opacity-50 cursor-not-allowed'
              )}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ x: hasAccess && !isActive ? 4 : 0 }}
              whileTap={{ scale: hasAccess ? 0.98 : 1 }}
            >
              <div className="relative">
                <motion.div
                  whileHover={{ rotate: hasAccess && !isActive ? 5 : 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Icon className={cn("w-5 h-5", (item.showWarning || !hasAccess) && !isActive && "text-muted-foreground")} />
                </motion.div>
                {item.showWarning && hasAccess && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-2 w-2 text-white" />
                  </div>
                )}
                {!hasAccess && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-muted-foreground rounded-full flex items-center justify-center">
                    <Lock className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>
              <span className={cn("font-medium text-sm", (item.showWarning || !hasAccess) && !isActive && "text-muted-foreground")}>
                {item.label}
              </span>
              
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  className="absolute right-3 h-2 w-2 bg-primary-foreground rounded-full"
                  layoutId="activeNavDot"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );

          if (!hasAccess) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  You don't have permission to access this
                </TooltipContent>
              </Tooltip>
            );
          }

          return button;
        })}
      </nav>

      {/* Footer */}
      <motion.div 
        className="p-3 border-t border-border/30 space-y-3 flex-shrink-0 bg-gradient-to-t from-secondary/30 to-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Theme Switcher */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
          {[
            { theme: 'light' as const, icon: Sun, label: 'Light' },
            { theme: 'dark' as const, icon: Moon, label: 'Dark' },
            { theme: 'pastel' as const, icon: Palette, label: 'Pastel' },
          ].map(({ theme: t, icon: ThemeIcon, label }) => (
            <motion.div key={t} className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant={theme === t ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTheme(t)}
                className={cn(
                  "w-full h-8 text-xs gap-1",
                  theme === t && "btn-glow"
                )}
              >
                <ThemeIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Music & Sign Out */}
        <div className="flex gap-2">
          <MusicPlayer />
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full gap-2 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </motion.div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          © 2025 Cohen-EDAS • AI Education Assistant
        </p>
      </motion.div>
      
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </aside>
  );
}