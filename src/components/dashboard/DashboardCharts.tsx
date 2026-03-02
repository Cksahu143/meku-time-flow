import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';

const weekData = [
  { name: 'Mon', tasks: 120, completed: 80 },
  { name: 'Tue', tasks: 180, completed: 140 },
  { name: 'Wed', tasks: 240, completed: 200 },
  { name: 'Thu', tasks: 300, completed: 280 },
  { name: 'Fri', tasks: 350, completed: 310 },
  { name: 'Sat', tasks: 400, completed: 360 },
  { name: 'Sun', tasks: 450, completed: 420 },
];

const monthData = [
  { name: 'Jan', tasks: 80, completed: 50 },
  { name: 'Feb', tasks: 120, completed: 90 },
  { name: 'Mar', tasks: 280, completed: 240 },
  { name: 'Apr', tasks: 350, completed: 300 },
  { name: 'May', tasks: 420, completed: 380 },
  { name: 'Jun', tasks: 480, completed: 440 },
];

const subjectDistribution = [
  { name: 'Mathematics', value: 30, color: 'hsl(var(--primary))' },
  { name: 'Science', value: 25, color: 'hsl(var(--chart-2))' },
  { name: 'English', value: 20, color: 'hsl(var(--success))' },
  { name: 'Other', value: 25, color: 'hsl(var(--chart-4))' },
];

type TimeRange = 'week' | 'month';

export const DashboardCharts: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const data = timeRange === 'week' ? weekData : monthData;

  return (
    <div className="space-y-6">
      {/* Activity Overview - Line Chart */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Activity Overview</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-0.5 bg-secondary/60 rounded-lg">
                {(['week', 'month'] as TimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      'h-7 px-3 text-xs capitalize rounded-md',
                      timeRange === range && 'bg-card shadow-sm text-foreground'
                    )}
                  >
                    {range}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              Tasks
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Completed
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={timeRange}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="h-[220px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorTasks2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(280 60% 60%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(280 60% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '10px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Area type="monotone" dataKey="tasks" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTasks2)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                  <Area type="monotone" dataKey="completed" stroke="hsl(280 60% 60%)" fillOpacity={1} fill="url(#colorCompleted2)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(280 60% 60%)' }} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};
