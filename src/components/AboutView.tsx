import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Zap, BookOpen, Users, Clock,
  MessageSquare, BarChart3, Shield, Mic, Timer, Calendar,
  ArrowRight, Sparkles, Brain, Target, TrendingDown, TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AboutViewProps {
  onNavigate?: (view: string) => void;
}

const problems = [
  {
    icon: AlertTriangle,
    title: 'Fragmented Tools',
    description: 'Students juggle between 5+ apps for scheduling, notes, chat, tasks, and study timers — wasting time switching context.',
    stat: '5+',
    statLabel: 'apps replaced',
  },
  {
    icon: TrendingDown,
    title: 'Declining Engagement',
    description: 'Without centralized tracking, students lose motivation. Teachers lack visibility into who needs help.',
    stat: '40%',
    statLabel: 'drop-off rate',
  },
  {
    icon: Clock,
    title: 'Wasted Administrative Time',
    description: 'Manual attendance, scattered announcements, and disconnected grade books consume hours of teacher time weekly.',
    stat: '8hrs',
    statLabel: 'saved per week',
  },
  {
    icon: Shield,
    title: 'No Role-Based Access',
    description: 'Most student tools treat everyone the same. Schools need tiered access for students, teachers, and admins.',
    stat: '4',
    statLabel: 'role tiers',
  },
];

const solutions = [
  {
    icon: BookOpen,
    title: 'Unified Learning Hub',
    description: 'Timetables, resources, transcription, and study tools — all in one place.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: MessageSquare,
    title: 'Real-Time Collaboration',
    description: 'Group chats, direct messaging, file sharing, and voice messages for seamless teamwork.',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    icon: Timer,
    title: 'Productivity Suite',
    description: 'Pomodoro timer, to-do lists, and calendar integration to keep students focused.',
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    icon: Mic,
    title: 'AI-Powered Transcription',
    description: 'Live lecture transcription turns spoken words into searchable, organized notes instantly.',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Actionable Analytics',
    description: 'Dashboards for admins and teachers to track attendance, engagement, and performance trends.',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    icon: Shield,
    title: 'Enterprise-Grade RBAC',
    description: 'Granular permissions for students, teachers, school admins, and platform admins.',
    color: 'bg-red-500/10 text-red-600',
  },
];

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } } },
};

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-12">
      {/* Hero */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Sparkles className="h-4 w-4" />
          About EDAS
        </motion.div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          Education, <span className="text-primary">Simplified.</span>
        </h1>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          EDAS (Education Digital Assistant System) eliminates the chaos of fragmented educational tools 
          by unifying everything students, teachers, and administrators need into one intelligent platform.
        </p>
      </motion.div>

      {/* Problems Section */}
      <motion.section
        className="space-y-6"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-destructive/10">
            <Target className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">The Problems We Eliminate</h2>
            <p className="text-sm text-muted-foreground">Challenges that hold education back</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {problems.map((problem, i) => (
            <motion.div key={problem.title} variants={stagger.item}>
              <Card className="border-border/40 hover:border-destructive/30 transition-all group h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-destructive/10 flex-shrink-0 group-hover:bg-destructive/15 transition-colors">
                      <problem.icon className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-foreground">{problem.title}</h3>
                        <Badge variant="outline" className="text-xs border-destructive/30 text-destructive flex-shrink-0">
                          {problem.stat} {problem.statLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{problem.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Divider with arrow */}
      <motion.div
        className="flex items-center justify-center gap-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="h-px flex-1 bg-border" />
        <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          >
            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
          </motion.div>
        </div>
        <div className="h-px flex-1 bg-border" />
      </motion.div>

      {/* Solutions Section */}
      <motion.section
        className="space-y-6"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">How EDAS Solves It</h2>
            <p className="text-sm text-muted-foreground">One platform, every need covered</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {solutions.map((solution, i) => (
            <motion.div key={solution.title} variants={stagger.item}>
              <Card className="border-border/40 hover:border-primary/30 hover:shadow-sm transition-all group h-full">
                <CardContent className="p-5">
                  <div className={`p-2.5 rounded-xl ${solution.color} w-fit mb-3 group-hover:scale-105 transition-transform`}>
                    <solution.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{solution.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{solution.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Impact Banner */}
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 md:p-10">
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { value: '10x', label: 'Faster Workflow', icon: TrendingUp },
              { value: '1', label: 'Unified Platform', icon: Brain },
              { value: '100%', label: 'Role-Based Security', icon: Shield },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="space-y-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <stat.icon className="h-6 w-6 text-primary-foreground/70 mx-auto" />
                <div className="text-3xl md:text-4xl font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-sm text-primary-foreground/80 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      {onNavigate && (
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-muted-foreground text-sm">Ready to explore?</p>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => onNavigate('dashboard')}
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};
