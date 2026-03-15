import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, CheckSquare,
  Clock, Calendar, ListTodo, Timer, BookOpen, MessageSquare, Mic,
  ChevronRight, ArrowUpRight, Target, Building2, Shield,
  Sparkles, Zap, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { useCountUp } from '@/hooks/useMotion';
import { supabase } from '@/integrations/supabase/client';
import { RoleBadge } from '@/components/RoleBadge';
import { useRBACContext } from '@/contexts/RBACContext';
import { MyPermissionsPanel } from '@/components/MyPermissionsPanel';
import { GlowOrb } from '@/components/motion/GlowOrb';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, gradient, suffix = '', trend, trendUp, delay = 0 }) => {
  const count = useCountUp(value, 1800);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="relative"
    >
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] rounded-2xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--success)), hsl(var(--primary)))`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <Card className="card-premium overflow-hidden group relative">
        {/* Glow orb ambient effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <GlowOrb color="var(--primary)" size={120} x="80%" y="20%" delay={delay} blur={40} />
          <GlowOrb color="var(--accent)" size={80} x="10%" y="80%" delay={delay + 1} blur={30} />
        </div>

        {/* Hover gradient fill */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 0.06 }}
          transition={{ duration: 0.5 }}
        />

        {/* Corner shimmer accent */}
        <motion.div
          className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay }}
        />

        <CardContent className="p-5 relative z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground font-medium mb-1.5">{title}</p>
              <div className="flex items-baseline gap-1.5">
                <motion.span 
                  className="font-display text-3xl font-extrabold text-foreground tracking-tight"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (delay || 0) + 0.2, type: 'spring', stiffness: 200 }}
                >
                  {count.toLocaleString()}{suffix}
                </motion.span>
              </div>
              {trend && (
                <motion.div 
                  className={`flex items-center gap-1 mt-2.5 text-xs font-semibold ${trendUp ? 'text-success' : 'text-destructive'}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (delay || 0) + 0.5, type: 'spring' }}
                >
                  <motion.div animate={{ y: trendUp ? [0, -2, 0] : [0, 2, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <ArrowUpRight className={`h-3 w-3 ${!trendUp ? 'rotate-90' : ''}`} />
                  </motion.div>
                  {trend}
                </motion.div>
              )}
            </div>
            <motion.div 
              className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-md relative overflow-hidden`}
              whileHover={{ scale: 1.15, rotate: 8 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Icon className="h-5 w-5 text-primary-foreground relative z-10" />
              {/* Icon shimmer */}
              <motion.div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, transparent 30%, hsl(0 0% 100% / 0.25) 50%, transparent 70%)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, delay }}
              />
            </motion.div>
          </div>
          
          {/* Sparkline */}
          <div className="mt-4 h-8">
            <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id={`grad-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path
                d="M 0 25 Q 15 18 25 16 T 50 13 T 75 9 T 100 6"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: (delay || 0) + 0.3, duration: 1.2, ease: 'easeOut' }}
              />
              <motion.path
                d="M 0 25 Q 15 18 25 16 T 50 13 T 75 9 T 100 6 V 30 H 0 Z"
                fill={`url(#grad-${title.replace(/\s/g, '')})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: (delay || 0) + 0.8, duration: 0.6 }}
              />
              {/* Animated dot at end of sparkline */}
              <motion.circle
                cx="100"
                cy="6"
                r="3"
                fill="hsl(var(--primary))"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.2, 0.8] }}
                transition={{ delay: (delay || 0) + 1.2, duration: 2, repeat: Infinity }}
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [userName, setUserName] = useState('Student');
  const [stats, setStats] = useState({ students: 0, tasks: 0, attendance: 0, groups: 0 });
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; text: string; time: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { userRole, canManageUsers, hasPermission, canAccessView } = useRBACContext();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) setUserName(profile.display_name || profile.username || 'Student');

      const [examsResult, groupsResult] = await Promise.all([
        supabase.from('exams').select('id', { count: 'exact' }).eq('user_id', session.user.id),
        supabase.from('group_members').select('id', { count: 'exact' }).eq('user_id', session.user.id),
      ]);

      setStats({
        students: 248,
        tasks: examsResult.count || 12,
        attendance: 94,
        groups: groupsResult.count || 0,
      });

      const { data: activities } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activities?.length) {
        setRecentActivity(activities.map(a => ({
          id: a.id,
          text: formatActivityText(a.activity_type, a.target_type),
          time: formatTimeAgo(new Date(a.created_at)),
          type: a.activity_type,
        })));
      } else {
        setRecentActivity([
          { id: '1', text: 'Welcome to EDAS!', time: 'Just now', type: 'welcome' },
          { id: '2', text: 'Explore your dashboard', time: 'Just now', type: 'info' },
        ]);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatActivityText = (type: string, target?: string | null): string => {
    const texts: Record<string, string> = {
      'exam_created': 'Created a new exam',
      'group_joined': 'Joined a study group',
      'resource_added': 'Added a new resource',
      'task_completed': 'Completed a task',
      'pomodoro_completed': 'Finished a Pomodoro session',
      'follow': `Started following ${target || 'someone'}`,
      'post': 'Created a new post',
    };
    return texts[type] || 'Activity recorded';
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const adminActions = [
    ...(canManageUsers() ? [{ title: 'Manage Users', icon: Users, view: 'role-management' }] : []),
    ...(canAccessView('schools-management') ? [{ title: 'Manage Schools', icon: Building2, view: 'schools-management' }] : []),
  ];

  const quickActions = [
    { title: 'Timetable', icon: Clock, view: 'timetable', color: 'from-primary to-primary/70' },
    { title: 'Calendar', icon: Calendar, view: 'calendar', color: 'from-accent to-accent/70' },
    { title: 'Tasks', icon: ListTodo, view: 'todo', color: 'from-success to-success/70' },
    { title: 'Pomodoro', icon: Timer, view: 'pomodoro', color: 'from-destructive to-destructive/70' },
    { title: 'Chat', icon: MessageSquare, view: 'groups', color: 'from-primary-glow to-primary' },
    { title: 'Resources', icon: BookOpen, view: 'resources', color: 'from-accent to-accent/60' },
    { title: 'Transcribe', icon: Mic, view: 'transcribe', color: 'from-success to-success/60' },
  ];

  const taskSummary = [
    { label: 'Pending', count: 18, color: 'bg-accent' },
    { label: 'In Progress', count: 32, color: 'bg-primary' },
    { label: 'Completed', count: 215, color: 'bg-success' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Hero Banner */}
      <motion.div
        className="relative rounded-2xl overflow-hidden h-[200px] md:h-[240px]"
        initial={{ opacity: 0, y: -15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.img
          src="/images/hero-banner.jpg"
          alt="Campus"
          className="w-full h-full object-cover brightness-[0.85] dark:brightness-[0.5]"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent dark:from-background/95 dark:via-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex items-center px-8 md:px-10">
          <div>
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/12 backdrop-blur-md border border-primary/15 mb-4"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              </motion.div>
              <span className="text-xs font-medium text-foreground/90 tracking-wide">Your AI Education Assistant</span>
            </motion.div>
            <motion.h1
              className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mb-2 tracking-tight"
              initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Welcome back, {userName}!
            </motion.h1>
            <motion.p
              className="text-muted-foreground text-sm md:text-base max-w-md font-medium"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              Let's make today productive ✨
            </motion.p>
            <motion.div
              className="mt-4 flex items-center gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, type: 'spring' }}
            >
              <RoleBadge size="sm" showIcon animated />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={stats.students} icon={Users} gradient="from-primary to-primary-glow" trend="↑ 12% this week" trendUp delay={0.1} />
        <StatCard title="Assignments" value={stats.tasks} icon={CheckSquare} gradient="from-success to-success/80" trend="↑ 8% this month" trendUp delay={0.15} />
        <StatCard title="Attendance Rate" value={stats.attendance} icon={GraduationCap} gradient="from-accent to-accent-glow" suffix="%" delay={0.2} />
        <StatCard title="Active Groups" value={stats.groups} icon={MessageSquare} gradient="from-primary-glow to-primary" delay={0.25} />
      </div>

      {/* Admin Actions */}
      {adminActions.length > 0 && (
        <motion.div
          className="flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-4 w-4" /> Admin:
          </span>
          {adminActions.map((action, i) => (
            <motion.div 
              key={action.view} 
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.05 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs rounded-xl border-border/30 hover:border-primary/20 hover:shadow-sm"
                onClick={() => onNavigate(action.view)}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.title}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Charts + Task Summary */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <DashboardCharts />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display font-bold flex items-center gap-2">
                <motion.div 
                  className="p-1.5 rounded-lg bg-accent/10"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                >
                  <Zap className="h-3.5 w-3.5 text-accent" />
                </motion.div>
                Task Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {taskSummary.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="flex items-center justify-between group/item"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, type: 'spring' }}
                >
                  <div className="flex items-center gap-2.5">
                    <motion.div 
                      className={`h-3 w-3 rounded-full ${item.color} shadow-sm`}
                      whileHover={{ scale: 1.4 }}
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    />
                    <span className="text-sm text-muted-foreground group-hover/item:text-foreground transition-colors">{item.label}</span>
                  </div>
                  <motion.span 
                    className="font-display text-sm font-bold text-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                  >
                    {item.count}
                  </motion.span>
                </motion.div>
              ))}
              <div className="pt-1">
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-primary text-xs font-semibold hover:text-primary/80 group/link"
                  onClick={() => onNavigate('todo')}
                >
                  View All 
                  <motion.span 
                    className="inline-block ml-0.5"
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </motion.span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <h2 className="font-display text-base font-bold mb-4 flex items-center gap-2">
          <motion.div 
            className="p-1.5 rounded-lg bg-primary/10"
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            <Target className="h-3.5 w-3.5 text-primary" />
          </motion.div>
          Quick Actions
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.view}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card border border-border/20 hover:border-primary/20 transition-all group card-premium"
              onClick={() => onNavigate(action.view)}
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.05, type: 'spring', stiffness: 200 }}
              whileHover={{ y: -6, scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
            >
              <motion.div 
                className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} shadow-md group-hover:shadow-lg transition-shadow`}
                whileHover={{ rotate: 8, scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <action.icon className="h-5 w-5 text-primary-foreground" />
              </motion.div>
              <span className="text-xs font-semibold text-foreground">{action.title}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
      >
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-bold flex items-center gap-2">
              <motion.div 
                className="p-1.5 rounded-lg bg-success/10"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Activity className="h-3.5 w-3.5 text-success" />
              </motion.div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors group/activity"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.05, type: 'spring' }}
                  whileHover={{ x: 4 }}
                >
                  <motion.div 
                    className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0 shadow-sm"
                    whileHover={{ scale: 1.5 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  />
                  <span className="text-sm text-foreground flex-1 group-hover/activity:text-primary transition-colors">{activity.text}</span>
                  <span className="text-xs text-muted-foreground font-medium">{activity.time}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* My Permissions Panel — Full width, below activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.5 }}
      >
        <MyPermissionsPanel />
      </motion.div>
    </div>
  );
};
