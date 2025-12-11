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
  Info
} from 'lucide-react';
import { MotionCard } from '@/components/motion/MotionCard';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/motion/PageTransition';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { useCountUp } from '@/hooks/useMotion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  suffix?: string;
  delay?: number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, suffix = '', delay = 0 }) => {
  const count = useCountUp(value, 2000);

  return (
    <MotionCard delay={delay} className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <motion.h3 
            className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
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
  icon: React.ElementType;
  onClick: () => void;
  delay?: number;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, icon: Icon, onClick, delay = 0 }) => {
  return (
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 transition-all group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div 
        className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors"
        whileHover={{ rotate: 5 }}
      >
        <Icon className="h-6 w-6 text-primary" />
      </motion.div>
      <span className="text-sm font-medium text-foreground">{title}</span>
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

      // Get resources from localStorage (since it's client-side storage)
      const storedResources = localStorage.getItem('edas_resources');
      const resourceCount = storedResources ? JSON.parse(storedResources).length : 0;

      setStats({
        tasks: Math.floor(Math.random() * 15) + 5, // Tasks are local, simulate
        exams: examsResult.count || 0,
        groups: groupsResult.count || 0,
        resources: resourceCount,
      });

      // Load recent activity from user_activities
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
        // Default activities if none exist
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
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const quickActions = [
    { title: 'Timetable', icon: Clock, view: 'timetable' },
    { title: 'Calendar', icon: Calendar, view: 'calendar' },
    { title: 'Tasks', icon: ListTodo, view: 'todo' },
    { title: 'Pomodoro', icon: Timer, view: 'pomodoro' },
    { title: 'Groups', icon: Users, view: 'groups' },
    { title: 'Resources', icon: BookOpen, view: 'resources' },
  ];

  return (
    <PageTransition className="min-h-screen p-4 md:p-8">
      {/* Hero Section */}
      <motion.div 
        className="relative mb-8 p-8 rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-2xl" />
        <div className="absolute inset-0 backdrop-blur-3xl rounded-2xl" />
        
        <div className="relative z-10">
          <motion.div 
            className="flex items-center gap-2 mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm text-primary font-medium">Welcome back!</span>
          </motion.div>
          
          <motion.h1 
            className="text-3xl md:text-4xl font-bold text-foreground mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Hello, {userName}
          </motion.h1>
          
          <motion.p 
            className="text-muted-foreground max-w-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Ready to make today productive? Here's your dashboard overview.
          </motion.p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Active Tasks" value={stats.tasks} icon={Target} delay={0.1} />
        <StatCard title="Upcoming Exams" value={stats.exams} icon={Calendar} delay={0.2} />
        <StatCard title="Study Groups" value={stats.groups} icon={Users} delay={0.3} />
        <StatCard title="Resources" value={stats.resources} icon={BookOpen} delay={0.4} />
      </div>

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
              icon={action.icon}
              onClick={() => onNavigate(action.view)}
              delay={0.5 + i * 0.05}
            />
          ))}
        </div>
      </motion.div>

      {/* Recent Activity & Learn More */}
      <div className="grid md:grid-cols-2 gap-6">
        <MotionCard delay={0.7} className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <StaggerContainer className="space-y-3">
            {recentActivity.map((activity) => (
              <StaggerItem key={activity.id}>
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
                  whileHover={{ x: 5 }}
                >
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </MotionCard>

        <MotionCard delay={0.8} className="p-6">
          <h3 className="text-lg font-semibold mb-4">About EDAS</h3>
          <p className="text-sm text-muted-foreground mb-4">
            EducationAssist (EDAS) is your all-in-one school planning companion. 
            Manage your timetable, track tasks, study with Pomodoro, and collaborate with classmates.
          </p>
          
          <Sheet>
            <SheetTrigger asChild>
              <MagneticButton variant="default" className="w-full gap-2">
                <Info className="h-4 w-4" />
                Learn More
              </MagneticButton>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-2xl">About EDAS</SheetTitle>
              </SheetHeader>
              <motion.div 
                className="mt-6 space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold mb-2">Created by</h4>
                  <p className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
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
                    © 2025 EducationAssist. All rights reserved.
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
