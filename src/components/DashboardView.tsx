import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  ListTodo, 
  BookOpen, 
  Users, 
  Timer,
  TrendingUp,
  Target,
  Sparkles,
  ChevronRight,
  Info,
  Upload,
  Link2,
  FileText,
  Mic,
  Shield,
  Building2,
  Settings
} from 'lucide-react';
import { MotionCard } from '@/components/motion/MotionCard';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/motion/PageTransition';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { useCountUp } from '@/hooks/useMotion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RoleCard, RoleBadge } from '@/components/RoleBadge';
import { useRBACContext } from '@/contexts/RBACContext';
import { PermissionGuard } from '@/components/PermissionGuard';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, suffix = '', delay = 0 }) => {
  const count = useCountUp(value, 2000);

  return (
    <MotionCard delay={delay} className="p-5 bg-card border-border/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <motion.h3 
            className="text-3xl font-bold mt-2 text-gradient-blue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {count}{suffix}
          </motion.h3>
        </div>
        <motion.div 
          className="p-3 rounded-xl bg-primary/10"
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Icon className="h-6 w-6 text-primary" />
        </motion.div>
      </div>
    </MotionCard>
  );
};

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  delay?: number;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon: Icon, onClick, delay = 0 }) => {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
    >
      <motion.div 
        className="p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors"
        whileHover={{ rotate: 5 }}
      >
        <Icon className="h-6 w-6 text-primary" />
      </motion.div>
      <div>
        <span className="text-sm font-semibold text-foreground block">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </motion.button>
  );
};

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [userName, setUserName] = useState('Student');
  const [stats, setStats] = useState({ tasks: 0, exams: 0, groups: 0, resources: 0 });
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; text: string; time: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { userRole, canManageUsers, hasPermission, canAccessView } = useRBACContext();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.display_name || profile.username || 'Student');
      }

      // Load real stats
      const [examsResult, groupsResult] = await Promise.all([
        supabase.from('exams').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('group_members').select('id', { count: 'exact' }).eq('user_id', user.id),
      ]);

      const storedResources = localStorage.getItem('edas_resources');
      const resourceCount = storedResources ? JSON.parse(storedResources).length : 0;

      setStats({
        tasks: Math.floor(Math.random() * 15) + 5,
        exams: examsResult.count || 0,
        groups: groupsResult.count || 0,
        resources: resourceCount,
      });

      // Load recent activity
      const { data: activities } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activities && activities.length > 0) {
        setRecentActivity(activities.map(a => ({
          id: a.id,
          text: formatActivityText(a.activity_type, a.target_type),
          time: formatTimeAgo(new Date(a.created_at)),
          type: a.activity_type,
        })));
      } else {
        setRecentActivity([
          { id: '1', text: 'Welcome to Cohen-EDAS!', time: 'Just now', type: 'welcome' },
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
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const quickActions = [
    { title: 'Timetable', description: 'View schedule', icon: Clock, view: 'timetable' },
    { title: 'Calendar', description: 'Track exams', icon: Calendar, view: 'calendar' },
    { title: 'Tasks', description: 'Manage todos', icon: ListTodo, view: 'todo' },
    { title: 'Pomodoro', description: 'Focus timer', icon: Timer, view: 'pomodoro' },
    { title: 'Groups', description: 'Study chat', icon: Users, view: 'groups' },
    { title: 'Resources', description: 'Your materials', icon: BookOpen, view: 'resources' },
  ];

  const aiActions = [
    { title: 'Upload Audio/Video', icon: Upload, desc: 'Convert to notes' },
    { title: 'Paste URL', icon: Link2, desc: 'Transcribe video' },
    { title: 'Explore Resources', icon: BookOpen, desc: 'View materials' },
  ];

  // Admin quick actions based on role
  const adminActions = [
    ...(canManageUsers() ? [{ title: 'Manage Users', icon: Users, view: 'role-management', desc: 'User roles' }] : []),
    ...(canAccessView('schools-management') ? [{ title: 'Manage Schools', icon: Building2, view: 'schools-management', desc: 'Schools' }] : []),
  ];

  return (
    <PageTransition className="min-h-screen p-4 md:p-8 bg-hero-gradient">
      {/* Role Card - Prominent display */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <RoleCard />
      </motion.div>

      {/* Admin Quick Actions - Only for admins */}
      {adminActions.length > 0 && (
        <motion.div 
          className="mb-6 p-4 rounded-xl bg-card border border-border/50 shadow-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Admin Actions</span>
            <RoleBadge size="sm" animated />
          </div>
          <div className="flex gap-3 flex-wrap">
            {adminActions.map((action) => (
              <motion.button
                key={action.view}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(action.view)}
              >
                <action.icon className="h-4 w-4 text-primary" />
                {action.title}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Hero Section */}
      <motion.div 
        className="relative mb-8 p-8 rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <motion.div 
              className="flex items-center gap-2 mb-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-primary font-medium">Welcome back, {userName}!</span>
            </motion.div>
            
            <motion.h1 
              className="text-3xl md:text-4xl font-bold text-foreground mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              Cohen - <span className="text-gradient-blue">EDAS</span>
            </motion.h1>
            
            <motion.p 
              className="text-muted-foreground max-w-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              Convert audio, video, or links into English study notes.
            </motion.p>
          </div>

          {/* AI Actions in Hero */}
          <motion.div 
            className="flex gap-3 flex-wrap"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
          >
            {aiActions.map((action, i) => (
              <motion.button
                key={action.title}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground shadow-md btn-glow text-sm font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('transcribe')}
              >
                <action.icon className="h-4 w-4" />
                {action.title}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <StatCard title="Transcription Items" value={2340} icon={FileText} delay={0.1} />
        <StatCard title="Minutes Processed" value={415} icon={Clock} suffix="h" delay={0.2} />
        <StatCard title="Study Notebooks" value={140} icon={BookOpen} suffix="+" delay={0.3} />
        <motion.div
          className="col-span-2 flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Shield className="h-8 w-8 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">No permanent storage • No resale or retainability</p>
            <p className="text-xs text-muted-foreground">Built for students & teachers • Fast & lightweight</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <div className="mb-8">
        <motion.h2 
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <TrendingUp className="h-5 w-5 text-primary" />
          Analytics
        </motion.h2>
        <DashboardCharts />
      </div>

      {/* Quick Actions */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <QuickAction
              key={action.view}
              title={action.title}
              description={action.description}
              icon={action.icon}
              onClick={() => onNavigate(action.view)}
              delay={0.5 + i * 0.05}
            />
          ))}
        </div>
      </motion.div>

      {/* Recent Activity & About */}
      <div className="grid md:grid-cols-2 gap-6">
        <MotionCard delay={0.7} className="p-6 bg-card border-border/50">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <StaggerContainer className="space-y-3">
            {recentActivity.map((activity) => (
              <StaggerItem key={activity.id}>
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                  whileHover={{ x: 4 }}
                >
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </MotionCard>

        <MotionCard delay={0.8} className="p-6 bg-card border-border/50">
          <h3 className="text-lg font-semibold mb-4">About Cohen - EDAS</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Cohen-EDAS is your all-in-one school planning and AI companion. 
            Designed to help students reduce pressure, not replace teachers. (FAQs)
          </p>
          
          <Sheet>
            <SheetTrigger asChild>
              <div className="flex gap-2">
                <MagneticButton variant="outline" className="flex-1 gap-2">
                  <FileText className="h-4 w-4" />
                  Get Quick Info
                </MagneticButton>
                <MagneticButton variant="outline" className="flex-1 gap-2">
                  <Sparkles className="h-4 w-4" />
                  Settings
                </MagneticButton>
              </div>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-2xl text-gradient-blue">About Cohen-EDAS</SheetTitle>
              </SheetHeader>
              <motion.div 
                className="mt-6 space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold mb-2">Created by</h4>
                  <p className="text-xl font-bold text-gradient-blue">
                    Charukrishna Sahu
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">About the Developer</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A passionate developer dedicated to creating tools that enhance the educational experience. 
                    EDAS was built with the vision of helping students manage their academic life more effectively.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Features</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      'Smart Timetable Management',
                      'Interactive Calendar with Exam Tracking',
                      'Task Management with Priorities',
                      'Pomodoro Timer for Focused Study',
                      'Group Collaboration & Messaging',
                      'Resource Management with Categories',
                      'AI Transcription for Audio/Video',
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    © 2025 Cohen-EDAS. All rights reserved.
                  </p>
                </div>
              </motion.div>
            </SheetContent>
          </Sheet>
        </MotionCard>
      </div>
    </PageTransition>
  );
};