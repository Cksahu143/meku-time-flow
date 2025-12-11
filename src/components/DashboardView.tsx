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

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, suffix = '', delay = 0, color = 'primary' }) => {
  const count = useCountUp(value, 2000);

  return (
    <MotionCard delay={delay} className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <motion.h3 
            className="text-3xl font-bold mt-2 bg-gradient-primary bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {count}{suffix}
          </motion.h3>
        </div>
        <motion.div 
          className={`p-3 rounded-xl bg-${color}/10`}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Icon className={`h-6 w-6 text-${color}`} />
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
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; text: string; time: string }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserName(profile.display_name || profile.username || 'Student');
    }

    // Load stats (mock for now, would need actual queries)
    setStats({
      tasks: 12,
      exams: 5,
      groups: 3,
      resources: 24,
    });

    setRecentActivity([
      { id: '1', text: 'Completed Math homework', time: '2 hours ago' },
      { id: '2', text: 'Joined Study Group', time: '5 hours ago' },
      { id: '3', text: 'Added new resource', time: 'Yesterday' },
      { id: '4', text: 'Completed Pomodoro session', time: 'Yesterday' },
    ]);
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
        {/* Background gradient */}
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

      {/* Quick Actions */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
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
        {/* Recent Activity */}
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

        {/* About Section */}
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
                  <p className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    Charukrishna Sahu
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">About the Developer</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A passionate developer dedicated to creating tools that enhance the educational experience. 
                    EDAS was built with the vision of helping students manage their academic life more effectively, 
                    combining modern design principles with practical functionality.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Features</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Smart Timetable Management
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Interactive Calendar with Exam Tracking
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Task Management with Priorities
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Pomodoro Timer for Focused Study
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Group Collaboration & Messaging
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Resource Management
                    </li>
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
