import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, ListTodo, Timer, Moon, Sun, Palette, LogOut,
  MessageSquare, BookOpen, LayoutDashboard, Mic, Lock, Shield,
  Building, Megaphone, UserCheck, BarChart3, Settings2, GraduationCap,
  BookOpenCheck, ChevronLeft, AlertCircle, Smartphone, ChevronDown,
  Download, RefreshCw
} from 'lucide-react';
import { ViewType } from '@/types';
import { cn } from '@/lib/utils';
import { useTheme } from '@/providers/ThemeProvider';
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

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: { id: ViewType; label: string; icon: React.ElementType }[];
}

// PWA Install/Update buttons component
const PWAButtons = ({ collapsed }: { collapsed: boolean }) => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        if (reg.waiting) { setWaitingWorker(reg.waiting); setUpdateAvailable(true); }
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(nw);
              setUpdateAvailable(true);
            }
          });
        });
      });
    }

    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  const handleUpdate = () => {
    if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  };

  if (!installPrompt && !updateAvailable) return null;

  return (
    <div className={cn('space-y-1.5 mb-3', collapsed ? 'px-0' : '')}>
      {updateAvailable && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={handleUpdate}
              className={cn(
                'w-full flex items-center gap-2 rounded-lg text-xs font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20',
                collapsed ? 'justify-center p-2' : 'px-3 py-2'
              )}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {!collapsed && 'Update Available'}
            </motion.button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Update App</TooltipContent>}
        </Tooltip>
      )}
      {installPrompt && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={handleInstall}
              className={cn(
                'w-full flex items-center gap-2 rounded-lg text-xs font-medium transition-colors bg-accent/10 text-accent-foreground hover:bg-accent/20',
                collapsed ? 'justify-center p-2' : 'px-3 py-2'
              )}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            >
              <Download className="h-3.5 w-3.5" />
              {!collapsed && 'Install App'}
            </motion.button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Install App</TooltipContent>}
        </Tooltip>
      )}
    </div>
  );
};

export function Sidebar({ currentView, onViewChange, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canAccessView, hasPermission, userRole, canManageUsers, schoolId } = useRBACContext();

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const showRoleManagement = canManageUsers() || hasPermission('can_change_any_role') || userRole === 'platform_admin' || userRole === 'school_admin';
  const showSchoolsManagement = userRole === 'platform_admin' || hasPermission('can_manage_schools') || (userRole === 'school_admin' && schoolId);
  const showAnnouncements = hasPermission('can_view_announcements') || hasPermission('can_post_announcements') || userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';
  const showAttendance = hasPermission('can_mark_attendance') || userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';
  const showAnalytics = hasPermission('can_view_analytics') || hasPermission('can_view_platform_analytics') || userRole === 'platform_admin' || userRole === 'school_admin';
  const showFeatureToggles = hasPermission('can_toggle_features') || hasPermission('can_manage_features') || userRole === 'platform_admin';
  const showClassesManagement = userRole === 'platform_admin' || userRole === 'school_admin' || hasPermission('can_manage_classes');
  const schoolsLabel = userRole === 'school_admin' ? 'My School' : 'Schools';

  const sections: NavSection[] = [
    {
      id: 'main',
      label: 'Main',
      icon: LayoutDashboard,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'about', label: 'About', icon: AlertCircle },
      ],
    },
    {
      id: 'productivity',
      label: 'Productivity',
      icon: Clock,
      items: [
        { id: 'timetable', label: 'Timetable', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'todo', label: 'To-Do List', icon: ListTodo },
        { id: 'pomodoro', label: 'Pomodoro', icon: Timer },
      ],
    },
    {
      id: 'collaborate',
      label: 'Collaborate',
      icon: MessageSquare,
      items: [
        { id: 'groups', label: 'Study Chat', icon: MessageSquare },
        { id: 'resources', label: 'Resources', icon: BookOpen },
        { id: 'saved-results' as ViewType, label: 'Saved AI', icon: BookOpenCheck },
        { id: 'transcribe', label: 'Transcribe', icon: Mic },
      ],
    },
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

  if (adminItems.length > 0) {
    sections.push({
      id: 'admin',
      label: 'Administration',
      icon: Shield,
      items: adminItems,
    });
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign out' });
    } else {
      navigate('/auth');
    }
  };

  const NavItem = ({ item, index }: { item: { id: ViewType; label: string; icon: React.ElementType }; index: number }) => {
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
          isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          !hasAccess && 'opacity-30 cursor-not-allowed'
        )}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.02 }}
        whileHover={hasAccess && !isActive ? { x: collapsed ? 0 : 4 } : undefined}
        whileTap={hasAccess ? { scale: 0.96 } : undefined}
      >
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 shadow-lg"
            style={{ boxShadow: '0 4px 16px hsl(225 85% 60% / 0.3)' }}
            layoutId="activeNav"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <div className="relative z-10 flex items-center gap-3 w-full">
          <motion.div
            className="relative flex-shrink-0"
            whileHover={hasAccess ? { rotate: [0, -10, 10, -5, 0], scale: 1.15 } : undefined}
            transition={{ duration: 0.4 }}
          >
            <Icon className="w-[18px] h-[18px]" />
            {!hasAccess && <Lock className="absolute -top-1 -right-1 h-2.5 w-2.5" />}
          </motion.div>
          {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
        </div>
        {isActive && !collapsed && (
          <motion.div
            className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground/80"
            layoutId="activeDot"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ scale: { duration: 2, repeat: Infinity }, opacity: { duration: 2, repeat: Infinity } }}
          />
        )}
      </motion.button>
    );

    if (collapsed || !hasAccess) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-medium">
            {!hasAccess ? <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> No permission</span> : item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <React.Fragment key={item.id}>{btn}</React.Fragment>;
  };

  let globalIndex = 0;

  return (
    <aside className={cn(
      'h-full flex flex-col transition-all duration-300 border-r border-sidebar-border/50 relative overflow-hidden',
      collapsed ? 'w-[68px]' : 'w-60'
    )} style={{ background: 'hsl(var(--sidebar))' }}>
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-0 w-full h-32 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--sidebar-primary) / 0.08) 0%, transparent 70%)'
      }} />

      {/* Logo */}
      <motion.div
        className={cn('flex items-center gap-3 flex-shrink-0 h-16 relative z-10', collapsed ? 'px-3 justify-center' : 'px-5')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="p-2 rounded-xl bg-gradient-primary flex-shrink-0 relative"
          style={{ boxShadow: '0 4px 16px hsl(225 85% 52% / 0.4)' }}
          whileHover={{ scale: 1.08, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <BookOpenCheck className="h-5 w-5 text-primary-foreground" />
          <motion.div className="absolute inset-0 rounded-xl overflow-hidden" initial={false}>
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, transparent 40%, hsl(0 0% 100% / 0.2) 50%, transparent 60%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            />
          </motion.div>
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
              <h1 className="font-display text-lg font-bold text-sidebar-foreground whitespace-nowrap tracking-tight">EDAS</h1>
              <p className="text-[10px] text-sidebar-muted font-medium -mt-0.5 tracking-wider uppercase">Education Assist</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />

      {/* Navigation with collapsible sections */}
      <nav className={cn('flex-1 py-3 overflow-y-auto scrollbar-none relative z-10', collapsed ? 'px-2' : 'px-3')}>
        {sections.map((section) => {
          const isSectionCollapsed = collapsedSections[section.id] ?? false;
          const sectionHasActive = section.items.some(item => currentView === item.id);
          const startIndex = globalIndex;
          globalIndex += section.items.length;

          return (
            <div key={section.id} className="mb-1">
              {/* Section header button */}
              {!collapsed ? (
                <motion.button
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[10px] uppercase tracking-[0.15em] font-semibold transition-colors group/section',
                    sectionHasActive ? 'text-sidebar-foreground/80' : 'text-sidebar-muted hover:text-sidebar-foreground/70',
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center gap-2">
                    <section.icon className="w-3 h-3" />
                    {section.label}
                  </span>
                  <motion.div
                    animate={{ rotate: isSectionCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-3 h-3 opacity-50 group-hover/section:opacity-100 transition-opacity" />
                  </motion.div>
                </motion.button>
              ) : (
                <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border/40 to-transparent my-2" />
              )}

              {/* Section items */}
              <AnimatePresence initial={false}>
                {(!isSectionCollapsed || collapsed) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-0.5">
                      {section.items.map((item, i) => (
                        <NavItem key={item.id} item={item} index={startIndex + i} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn('flex-shrink-0 relative z-10', collapsed ? 'p-2' : 'p-3')}>
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent mb-3" />

        {/* PWA Install/Update buttons */}
        <PWAButtons collapsed={collapsed} />
        
        {/* Theme toggles */}
        {!collapsed && (
          <div className="grid grid-cols-4 gap-0.5 p-1 bg-sidebar-accent/40 rounded-xl mb-3 backdrop-blur-sm">
            {[
              { theme: 'light' as const, icon: Sun, label: 'Light' },
              { theme: 'dark' as const, icon: Moon, label: 'Dark' },
              { theme: 'amoled' as const, icon: Smartphone, label: 'OLED' },
              { theme: 'pastel' as const, icon: Palette, label: 'Pastel' },
            ].map(({ theme: t, icon: ThemeIcon, label }) => (
              <motion.button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  'flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-medium transition-all relative',
                  theme === t ? 'text-sidebar-primary-foreground' : 'text-sidebar-muted hover:text-sidebar-foreground'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {theme === t && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-sidebar-primary shadow-md"
                    layoutId="activeTheme"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  <ThemeIcon className="w-3 h-3" />
                  {label}
                </span>
              </motion.button>
            ))}
          </div>
        )}

        <div className={cn('flex gap-1.5', collapsed ? 'flex-col items-center' : '')}>
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={onToggleCollapse}
                  className={cn(
                    'flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors',
                    collapsed ? 'w-full' : 'flex-1'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </motion.div>
                  {!collapsed && 'Collapse'}
                </motion.button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right">Expand</TooltipContent>}
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={handleSignOut}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-colors',
                  collapsed ? 'w-full' : 'flex-1'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut className="h-3.5 w-3.5" />
                {!collapsed && 'Sign Out'}
              </motion.button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
