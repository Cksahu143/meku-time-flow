import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCheck, 
  Calendar, 
  Users, 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRBACContext } from '@/contexts/RBACContext';
import { format, addDays, subDays, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  school_id: string;
  student_id: string;
  marked_by: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string | null;
  period_id: string | null;
}

interface StudentWithAttendance {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  attendance?: AttendanceRecord;
}

const statusConfig = {
  present: { label: 'Present', color: 'bg-green-500', icon: Check, textColor: 'text-green-600' },
  absent: { label: 'Absent', color: 'bg-red-500', icon: X, textColor: 'text-red-600' },
  late: { label: 'Late', color: 'bg-yellow-500', icon: Clock, textColor: 'text-yellow-600' },
  excused: { label: 'Excused', color: 'bg-blue-500', icon: AlertCircle, textColor: 'text-blue-600' },
};

export function AttendanceView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [submitting, setSubmitting] = useState<string | null>(null);
  const { toast } = useToast();
  const { hasPermission, userRole, schoolId } = useRBACContext();

  const canMark = hasPermission('can_mark_attendance') || userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      fetchAttendance();
    }
  }, [schoolId, selectedDate]);

  const fetchStudents = async () => {
    try {
      // Get students in the school
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const userIds = roleData.map(r => r.user_id);

      // Get profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;

      setStudents((profiles || []) as StudentWithAttendance[]);
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load students',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!schoolId) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('school_id', schoolId)
        .eq('date', dateStr);

      if (error) throw error;
      setAttendanceRecords((data || []) as AttendanceRecord[]);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
    }
  };

  const studentsWithAttendance = useMemo(() => {
    return students.map(student => {
      const record = attendanceRecords.find(r => r.student_id === student.id);
      return { ...student, attendance: record };
    });
  }, [students, attendanceRecords]);

  const filteredStudents = useMemo(() => {
    return studentsWithAttendance.filter(student => {
      const matchesSearch = 
        (student.display_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (student.username?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        filterStatus === 'all' || 
        (filterStatus === 'unmarked' && !student.attendance) ||
        student.attendance?.status === filterStatus;

      return matchesSearch && matchesFilter;
    });
  }, [studentsWithAttendance, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = students.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const excused = attendanceRecords.filter(r => r.status === 'excused').length;
    const unmarked = total - attendanceRecords.length;

    return { total, present, absent, late, excused, unmarked };
  }, [students, attendanceRecords]);

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    if (!schoolId) return;

    try {
      setSubmitting(studentId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const existing = attendanceRecords.find(r => r.student_id === studentId);

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('attendance')
          .update({ status, marked_by: user.id })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase.from('attendance').insert({
          school_id: schoolId,
          student_id: studentId,
          marked_by: user.id,
          date: dateStr,
          status,
        });

        if (error) throw error;
      }

      toast({
        title: 'Attendance Marked',
        description: `Marked as ${statusConfig[status].label}`,
      });

      fetchAttendance();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const markAllPresent = async () => {
    if (!schoolId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const unmarkedStudents = students.filter(
        s => !attendanceRecords.find(r => r.student_id === s.id)
      );

      if (unmarkedStudents.length === 0) {
        toast({
          title: 'All Marked',
          description: 'All students have already been marked',
        });
        return;
      }

      const records = unmarkedStudents.map(s => ({
        school_id: schoolId,
        student_id: s.id,
        marked_by: user.id,
        date: dateStr,
        status: 'present' as const,
      }));

      const { error } = await supabase.from('attendance').insert(records);
      if (error) throw error;

      toast({
        title: 'Success',
        description: `Marked ${unmarkedStudents.length} students as present`,
      });

      fetchAttendance();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
      });
    }
  };

  if (!schoolId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              You must be assigned to a school to view attendance
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage student attendance
          </p>
        </div>
      </motion.div>

      {/* Date Navigation */}
      <Card className="border-border/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(d => subDays(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-lg">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
              {isToday(selectedDate) && (
                <Badge variant="secondary">Today</Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(d => addDays(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-primary/10 text-primary' },
          { label: 'Present', value: stats.present, color: 'bg-green-500/10 text-green-600' },
          { label: 'Absent', value: stats.absent, color: 'bg-red-500/10 text-red-600' },
          { label: 'Late', value: stats.late, color: 'bg-yellow-500/10 text-yellow-600' },
          { label: 'Excused', value: stats.excused, color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Unmarked', value: stats.unmarked, color: 'bg-muted text-muted-foreground' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className={cn('text-2xl font-bold', stat.color.split(' ')[1])}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unmarked">Unmarked</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="excused">Excused</SelectItem>
          </SelectContent>
        </Select>

        {canMark && (
          <Button onClick={markAllPresent} className="gap-2">
            <Check className="h-4 w-4" />
            Mark All Present
          </Button>
        )}
      </div>

      {/* Student List */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {students.length === 0 ? 'No students in this school' : 'No matching students'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg border border-border/50 transition-colors',
                    student.attendance ? 'bg-card' : 'bg-muted/30'
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatar_url || undefined} />
                    <AvatarFallback>
                      {(student.display_name || student.username || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {student.display_name || student.username || 'Unknown'}
                    </p>
                    {student.attendance && (
                      <Badge 
                        variant="secondary" 
                        className={cn('text-xs', statusConfig[student.attendance.status].textColor)}
                      >
                        {statusConfig[student.attendance.status].label}
                      </Badge>
                    )}
                  </div>

                  {canMark && (
                    <div className="flex items-center gap-1">
                      {Object.entries(statusConfig).map(([status, config]) => {
                        const Icon = config.icon;
                        const isActive = student.attendance?.status === status;
                        return (
                          <Button
                            key={status}
                            variant={isActive ? 'default' : 'outline'}
                            size="icon"
                            className={cn(
                              'h-8 w-8',
                              isActive && config.color
                            )}
                            onClick={() => markAttendance(student.id, status as any)}
                            disabled={submitting === student.id}
                            title={config.label}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
