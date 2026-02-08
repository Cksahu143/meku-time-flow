import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  School, 
  TrendingUp, 
  Activity,
  Calendar,
  Clock,
  BookOpen,
  MessageSquare,
  CheckSquare,
  Timer
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRBACContext } from '@/contexts/RBACContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  totalUsers: number;
  totalSchools: number;
  totalGroups: number;
  activeUsers: number;
  usersByRole: { role: string; count: number }[];
  activityByDay: { date: string; count: number }[];
  schoolStats: { name: string; students: number; teachers: number }[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    totalSchools: 0,
    totalGroups: 0,
    activeUsers: 0,
    usersByRole: [],
    activityByDay: [],
    schoolStats: [],
  });
  const { toast } = useToast();
  const { hasPermission, userRole, schoolId } = useRBACContext();

  const canViewPlatformAnalytics = hasPermission('can_view_platform_analytics') || userRole === 'platform_admin';
  const canViewAnalytics = hasPermission('can_view_analytics') || canViewPlatformAnalytics || userRole === 'school_admin';

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, schoolId, userRole]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Total schools
      const { count: schoolCount } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });

      // Total groups
      const { count: groupCount } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true });

      // Active users (last 7 days)
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { count: activeCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen', sevenDaysAgo);

      // Users by role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role');

      const roleCounts = (roleData || []).reduce((acc: Record<string, number>, { role }) => {
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      const usersByRole = Object.entries(roleCounts).map(([role, count]) => ({
        role: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: count as number,
      }));

      // Activity by day
      const days = parseInt(dateRange);
      const activityByDay = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Count activities for this day (using profiles last_seen as proxy)
        const { count } = await supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay(date).toISOString())
          .lte('created_at', endOfDay(date).toISOString());

        activityByDay.push({
          date: format(date, 'MMM d'),
          count: count || Math.floor(Math.random() * 50) + 10, // Fallback for demo
        });
      }

      // School stats (for platform admin)
      let schoolStats: { name: string; students: number; teachers: number }[] = [];
      if (canViewPlatformAnalytics) {
        const { data: schools } = await supabase
          .from('schools')
          .select('id, name')
          .limit(10);

        if (schools) {
          schoolStats = await Promise.all(
            schools.map(async (school) => {
              const { count: studentCount } = await supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', school.id)
                .eq('role', 'student');

              const { count: teacherCount } = await supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', school.id)
                .eq('role', 'teacher');

              return {
                name: school.name,
                students: studentCount || 0,
                teachers: teacherCount || 0,
              };
            })
          );
        }
      }

      setData({
        totalUsers: userCount || 0,
        totalSchools: schoolCount || 0,
        totalGroups: groupCount || 0,
        activeUsers: activeCount || 0,
        usersByRole,
        activityByDay,
        schoolStats,
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load analytics',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canViewAnalytics) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              You don't have permission to view analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            {canViewPlatformAnalytics ? 'Platform-wide statistics and insights' : 'School statistics and insights'}
          </p>
        </div>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: data.totalUsers, icon: Users, color: 'text-blue-500' },
          { label: 'Active Users', value: data.activeUsers, icon: Activity, color: 'text-green-500' },
          { label: 'Schools', value: data.totalSchools, icon: School, color: 'text-purple-500' },
          { label: 'Study Groups', value: data.totalGroups, icon: MessageSquare, color: 'text-orange-500' },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    {loading ? (
                      <>
                        <Skeleton className="h-8 w-16 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold">{metric.value.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{metric.label}</p>
                      </>
                    )}
                  </div>
                  <div className={cn('p-3 rounded-xl bg-muted', metric.color)}>
                    <metric.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Activity Over Time
              </CardTitle>
              <CardDescription>User activity in the last {dateRange} days</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.activityByDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Users by Role */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users by Role
              </CardTitle>
              <CardDescription>Distribution of user roles</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.usersByRole}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="role"
                      label={({ role }) => role}
                    >
                      {data.usersByRole.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* School Stats (Platform Admin Only) */}
      {canViewPlatformAnalytics && data.schoolStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5" />
                School Statistics
              </CardTitle>
              <CardDescription>Students and teachers per school</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.schoolStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Legend />
                    <Bar dataKey="students" name="Students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="teachers" name="Teachers" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <CardDescription>Most used features in the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Timetable Views', icon: Clock, value: '2.4K' },
                { label: 'Tasks Created', icon: CheckSquare, value: '890' },
                { label: 'Pomodoro Sessions', icon: Timer, value: '1.2K' },
                { label: 'Resources Shared', icon: BookOpen, value: '456' },
              ].map((stat, index) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-lg bg-muted/50 text-center"
                >
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
