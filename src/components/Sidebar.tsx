import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, ListTodo, Timer, Moon, Sun, Palette, LogOut,
  MessageSquare, BookOpen, LayoutDashboard, Mic, Lock, Shield,
  Building, Megaphone, UserCheck, BarChart3, Settings2, GraduationCap,
  BookOpenCheck, ChevronLeft, AlertCircle
} from 'lucide-react';
import { ViewType } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useRBACContext } from '@/contexts/RBACContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ currentView, onViewChange, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canAccessView, hasPermission, userRole, canManageUsers, schoolId } = useRBACContext();

  const showRoleManagement = canManageUsers() || hasPermission('can_change_any_role') || userRole === 'platform_admin' || userRole === 'school_admin';
  const showSchoolsManagement = userRole === 'platform_admin' || hasPermission('can_manage_schools') || (userRole === 'school_admin' && schoolId);
  const showAnnouncements = hasPermission('can_view_announcements') || hasPermission('can_post_announcements') || userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';
  const showAttendance = hasPermission('can_mark_attendance') || userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';
  const showAnalytics = hasPermission('can_view_analytics') || hasPermission('can_view_platform_analytics') || userRole === 'platform_admin' || userRole === 'school_admin';
  const showFeatureToggles = hasPermission('can_toggle_features') || hasPermission('can_manage_features') || userRole === 'platform_admin';
  const showClassesManagement = userRole === 'platform_admin' || userRole === 'school_admin' || hasPermission('can_manage_classes');
  const schoolsLabel = userRole === 'school_admin' ? 'My School' : 'Schools';

  const coreItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'about' as ViewType, label: 'About', icon: AlertCircle },
    { id: 'timetable' as ViewType, label: 'Timetable', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
    { id: 'todo' as ViewType, label: 'To-Do List', icon: ListTodo },
    { id: 'pomodoro' as ViewType, label: 'Pomodoro', icon: Timer },
    { id: 'groups' as ViewType, label: 'Study Chat', icon: MessageSquare },
    { id: 'resources' as ViewType, label: 'Resources', icon: BookOpen },
    { id: 'transcribe' as ViewType, label: 'Transcribe', icon: Mic },
  ];

  const adminItems = [
    ...(showAnnouncements ? [{ id: 'announcements' as ViewType, label: 'Announcements', icon: Megaphone }] : []),
    ...(showAttendance ? [{ id: 'attendance' as ViewType, label: 'Attendance', icon: UserCheck }] : []),
    ...(showClassesManagement ? [{ id: 'classes-management' as ViewType, label: 'Classes', icon: GraduationCap }] : []),
    ...(showAnalytics ? [{ id: 'analytics' as ViewType, label: 'Analytics', icon: BarChart3 }] : []),
    ...(showRoleManagement ? [{ id: 'role-management' as ViewType, label: 'Roles', icon: Shield }] : []),
    ...(showSchoolsManagement ? [{ id: 'schools-management' as ViewType, label: schoolsLabel, icon: Building }] : []),
    ...(showFeatureToggles ? [{ id: 'feature-toggles' as ViewType, label: 'Features', icon: Settings2 }] : []),
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign out' });
    } else {
      navigate('/auth');
    }
  };

  const NavItem = ({ item, index }: { item: typeof coreItems[0]; index: number }) => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    const hasAccess = canAccessView(item.id);

    const btn = (
      <motion.button
        onClick={() => hasAccess && onViewChange(item.id)}
        disabled={!hasAccess}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl transition-all duration-200 relative group',
          collapsed ? 'px-3 py-2.5 justify-center' : 'px-3.5 py-2.5',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
            : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          !hasAccess && 'opacity-30 cursor-not-allowed'
        )}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.025 }}
        whileHover={hasAccess && !isActive ? { x: collapsed ? 0 : 4 } : undefined}
        whileTap={hasAccess ? { scale: 0.96 } : undefined}
      >
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-sidebar-primary"
            layoutId="activeNav"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <div className="relative z-10 flex items-center gap-3 w-full">
          <div className="relative flex-shrink-0">
            <Icon className="w-[18px] h-[18px]" />
            {!hasAccess && <Lock className="absolute -top-1 -right-1 h-2.5 w-2.5" />}
          </div>
          {!collapsed && (
            <span className="text-sm font-medium truncate">{item.label}</span>
          )}
        </div>
      </motion.button>
    );

    if (collapsed || !hasAccess) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {!hasAccess ? (
              <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> No permission</span>
            ) : item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <React.Fragment key={item.id}>{btn}</React.Fragment>;
  };

  return (
    <aside className={cn(
      'h-screen bg-sidebar flex flex-col transition-all duration-300 overflow-hidden border-r border-sidebar-border',
      collapsed ? 'w-[68px]' : 'w-60'
    )}>
      {/* Logo */}
      <motion.div
        className={cn(
          'flex items-center gap-3 flex-shrink-0 h-16',
          collapsed ? 'px-3 justify-center' : 'px-5'
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-2 rounded-xl bg-gradient-primary shadow-primary flex-shrink-0">
          <BookOpenCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <h1 className="font-display text-lg font-bold text-sidebar-foreground whitespace-nowrap tracking-tight">
                EDAS
              </h1>
              <p className="text-[10px] text-sidebar-muted font-medium -mt-0.5">Education Assist</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Divider */}
      <div className="mx-3 h-px bg-sidebar-border/50" />

      {/* Navigation */}
      <nav className={cn('flex-1 py-3 space-y-0.5 overflow-y-auto scrollbar-none', collapsed ? 'px-2' : 'px-3')}>
        {coreItems.map((item, index) => (
          <NavItem key={item.id} item={item} index={index} />
        ))}
        
        {adminItems.length > 0 && (
          <>
            <div className={cn('pt-3 pb-1', collapsed ? 'px-1' : 'px-1')}>
              <div className="h-px bg-sidebar-border/50" />
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-wider text-sidebar-muted font-semibold mt-3 mb-1 px-2">
                  Administration
                </p>
              )}
            </div>
            {adminItems.map((item, index) => (
              <NavItem key={item.id} item={item} index={coreItems.length + index} />
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={cn('flex-shrink-0', collapsed ? 'p-2' : 'p-3')}>
        <div className="h-px bg-sidebar-border/50 mb-3" />
        
        {/* Theme toggles */}
        {!collapsed && (
          <div className="flex gap-1 p-1 bg-sidebar-accent/50 rounded-lg mb-3">
            {[
              { theme: 'light' as const, icon: Sun, label: 'Light' },
              { theme: 'dark' as const, icon: Moon, label: 'Dark' },
              { theme: 'pastel' as const, icon: Palette, label: 'Pastel' },
            ].map(({ theme: t, icon: ThemeIcon, label }) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-all',
                  theme === t 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' 
                    : 'text-sidebar-muted hover:text-sidebar-foreground'
                )}
              >
                <ThemeIcon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className={cn('flex gap-1.5', collapsed ? 'flex-col items-center' : '')}>
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleCollapse}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
                    collapsed ? 'w-full' : 'flex-1'
                  )}
                >
                  <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </motion.div>
                  {!collapsed && 'Collapse'}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-colors',
                  collapsed ? 'w-full' : 'flex-1'
                )}
              >
                <LogOut className="h-3.5 w-3.5" />
                {!collapsed && 'Sign Out'}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
