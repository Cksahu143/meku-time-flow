import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MotionCard } from '@/components/motion/MotionCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChartData {
  name: string;
  tasks: number;
  completed: number;
  study: number;
}

const generateWeekData = (): ChartData[] => [
  { name: 'Mon', tasks: 4, completed: 3, study: 2.5 },
  { name: 'Tue', tasks: 3, completed: 2, study: 3 },
  { name: 'Wed', tasks: 5, completed: 4, study: 2 },
  { name: 'Thu', tasks: 2, completed: 2, study: 4 },
  { name: 'Fri', tasks: 6, completed: 5, study: 1.5 },
  { name: 'Sat', tasks: 1, completed: 1, study: 5 },
  { name: 'Sun', tasks: 2, completed: 1, study: 3 },
];

const generateMonthData = (): ChartData[] => [
  { name: 'Week 1', tasks: 15, completed: 12, study: 18 },
  { name: 'Week 2', tasks: 20, completed: 18, study: 22 },
  { name: 'Week 3', tasks: 18, completed: 15, study: 20 },
  { name: 'Week 4', tasks: 22, completed: 19, study: 25 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

type TimeRange = 'week' | 'month';

export const DashboardCharts: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const data = timeRange === 'week' ? generateWeekData() : generateMonthData();

  const subjectDistribution = [
    { name: 'Mathematics', value: 30 },
    { name: 'Physics', value: 25 },
    { name: 'English', value: 20 },
    { name: 'Other', value: 25 },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Activity Chart */}
      <MotionCard delay={0.5} className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Activity Overview</h3>
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(['week', 'month'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant="ghost"
                size="sm"
                onClick={() => setTimeRange(range)}
                className={cn(
                  'h-7 px-3 text-xs capitalize transition-all',
                  timeRange === range && 'bg-background shadow-sm'
                )}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={timeRange}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorTasks)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--accent))"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
        
        <div className="flex gap-4 mt-4 justify-center">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Tasks</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-muted-foreground">Completed</span>
          </div>
        </div>
      </MotionCard>

      {/* Study Hours Chart */}
      <MotionCard delay={0.6} className="p-6">
        <h3 className="text-lg font-semibold mb-4">Study Hours</h3>
        <AnimatePresence mode="wait">
          <motion.div
            key={timeRange}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="study"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  animationDuration={500}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Hours spent studying per {timeRange === 'week' ? 'day' : 'week'}
        </p>
      </MotionCard>

      {/* Subject Distribution */}
      <MotionCard delay={0.7} className="p-6 md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Subject Distribution</h3>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-[200px] w-full md:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={500}
                >
                  {subjectDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full md:w-1/2">
            {subjectDistribution.map((subject, index) => (
              <motion.div
                key={subject.name}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm">{subject.name}</span>
                <span className="text-sm text-muted-foreground ml-auto">{subject.value}%</span>
              </motion.div>
            ))}
          </div>
        </div>
      </MotionCard>
    </div>
  );
};
