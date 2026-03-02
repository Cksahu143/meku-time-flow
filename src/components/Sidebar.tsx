import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'about' as ViewType, label: 'About', icon: AlertCircle },
    { id: 'timetable' as ViewType, label: 'Timetable', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
    { id: 'todo' as ViewType, label: 'To-Do List', icon: ListTodo },
    { id: 'pomodoro' as ViewType, label: 'Pomodoro', icon: Timer },
    { id: 'groups' as ViewType, label: 'Study Chat', icon: MessageSquare },
    { id: 'resources' as ViewType, label: 'Resources', icon: BookOpen },
    { id: 'transcribe' as ViewType, label: 'Transcribe', icon: Mic },
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

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r border-border/40 flex flex-col transition-all duration-300 overflow-hidden',
        collapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Logo */}
      <motion.div
        className={cn(
          'flex items-center gap-3 border-b border-border/30 flex-shrink-0 h-16',
          collapsed ? 'px-3 justify-center' : 'px-5'
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="p-2 rounded-xl bg-primary shadow-md flex-shrink-0">
          <BookOpenCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <motion.h1
            className="text-lg font-bold text-foreground whitespace-nowrap"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            EDAS
          </motion.h1>
        )}
      </motion.div>

      {/* Navigation */}
      <nav className={cn('flex-1 py-3 space-y-0.5 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const hasAccess = canAccessView(item.id);

          const btn = (
            <motion.button
              key={item.id}
              onClick={() => hasAccess && onViewChange(item.id)}
              disabled={!hasAccess}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl transition-all duration-200 relative group',
                collapsed ? 'px-3 py-2.5 justify-center' : 'px-3.5 py-2.5',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
                !hasAccess && 'opacity-40 cursor-not-allowed'
              )}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              whileHover={hasAccess && !isActive ? { x: collapsed ? 0 : 3 } : undefined}
              whileTap={hasAccess ? { scale: 0.97 } : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-[18px] h-[18px]" />
                {!hasAccess && (
                  <Lock className="absolute -top-1 -right-1 h-2.5 w-2.5 text-muted-foreground" />
                )}
              </div>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <motion.div
                  className="absolute right-3 h-1.5 w-1.5 bg-primary-foreground rounded-full"
                  layoutId="activeNavDot"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
            </motion.button>
          );

          if (collapsed || !hasAccess) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {!hasAccess ? (
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3" /> No permission
                    </span>
                  ) : (
                    item.label
                  )}
                </TooltipContent>
              </Tooltip>
            );
          }

          return btn;
        })}
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-border/30 flex-shrink-0', collapsed ? 'p-2' : 'p-3')}>
        {/* Theme */}
        {!collapsed && (
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mb-2">
            {[
              { theme: 'light' as const, icon: Sun, label: 'Light' },
              { theme: 'dark' as const, icon: Moon, label: 'Dark' },
              { theme: 'pastel' as const, icon: Palette, label: 'Pastel' },
            ].map(({ theme: t, icon: ThemeIcon, label }) => (
              <Button
                key={t}
                variant={theme === t ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTheme(t)}
                className={cn('flex-1 h-7 text-xs gap-1', theme === t && 'shadow-sm')}
              >
                <ThemeIcon className="w-3 h-3" />
                {label}
              </Button>
            ))}
          </div>
        )}

        {/* Collapse + Sign out */}
        <div className={cn('flex gap-1.5', collapsed ? 'flex-col items-center' : '')}>
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className={cn('h-8 gap-1.5 text-xs', collapsed ? 'w-full' : 'flex-1')}
                >
                  <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </motion.div>
                  {!collapsed && 'Collapse'}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className={cn('h-8 text-xs text-muted-foreground hover:text-destructive', collapsed ? 'w-full' : 'flex-1')}
              >
                <LogOut className="h-3.5 w-3.5" />
                {!collapsed && <span className="ml-1.5">Sign Out</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
