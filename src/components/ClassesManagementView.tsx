import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Plus, 
  Users, 
  UserPlus, 
  BookOpen, 
  ChevronRight,
  Search,
  Edit,
  Trash2,
  UserCheck,
  ArrowUpRight,
  X,
  Check,
  AlertCircle,
  School
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRBACContext } from '@/contexts/RBACContext';
import { cn } from '@/lib/utils';

interface ClassData {
  id: string;
  school_id: string;
  name: string;
  grade_level: string;
  section: string | null;
  academic_year: string;
  class_teacher_id: string | null;
  max_students: number;
  is_active: boolean;
  created_at: string;
}

interface ClassStudent {
  id: string;
  class_id: string;
  student_id: string;
  roll_number: number | null;
  enrolled_at: string;
  status: 'active' | 'promoted' | 'transferred' | 'graduated' | 'dropped';
  promoted_to_class_id: string | null;
  promoted_at: string | null;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface TeacherProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface StudentProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const GRADE_LEVELS = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11', 'Class 12'
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function ClassesManagementView() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [selectedStudentsToPromote, setSelectedStudentsToPromote] = useState<string[]>([]);
  const [targetClassForPromotion, setTargetClassForPromotion] = useState<string>('');
  const { toast } = useToast();
  const { userRole, schoolId, hasPermission } = useRBACContext();

  const [newClass, setNewClass] = useState({
    name: '',
    grade_level: '',
    section: '',
    academic_year: '2025-2026',
    class_teacher_id: '',
    max_students: 40,
  });

  const canManage = userRole === 'platform_admin' || userRole === 'school_admin' || hasPermission('can_manage_classes');

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, [schoolId]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents(selectedClass.id);
      fetchAvailableStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      let query = supabase.from('classes').select('*').eq('is_active', true).order('grade_level');
      
      if (schoolId && userRole !== 'platform_admin') {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClasses((data || []) as ClassData[]);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load classes',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      let query = supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      
      if (schoolId && userRole !== 'platform_admin') {
        query = query.eq('school_id', schoolId);
      }

      const { data: roleData, error: roleError } = await query;
      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setTeachers([]);
        return;
      }

      const userIds = roleData.map(r => r.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;
      setTeachers((profiles || []) as TeacherProfile[]);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchClassStudents = async (classId: string) => {
    try {
      setStudentsLoading(true);
      const { data, error } = await supabase
        .from('class_students')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('roll_number');

      if (error) throw error;

      if (!data || data.length === 0) {
        setClassStudents([]);
        return;
      }

      // Fetch profiles for students
      const studentIds = data.map(s => s.student_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', studentIds);

      if (profileError) throw profileError;

      const studentsWithProfiles = data.map(student => ({
        ...student,
        profile: profiles?.find(p => p.id === student.student_id),
      })) as ClassStudent[];

      setClassStudents(studentsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching class students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      let query = supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');
      
      if (schoolId && userRole !== 'platform_admin') {
        query = query.eq('school_id', schoolId);
      }

      const { data: roleData, error: roleError } = await query;
      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setAvailableStudents([]);
        return;
      }

      const userIds = roleData.map(r => r.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;
      setAvailableStudents((profiles || []) as StudentProfile[]);
    } catch (error: any) {
      console.error('Error fetching available students:', error);
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.name || !newClass.grade_level) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in required fields',
      });
      return;
    }

    try {
      const targetSchoolId = schoolId;
      if (!targetSchoolId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No school selected',
        });
        return;
      }

      const { error } = await supabase.from('classes').insert({
        school_id: targetSchoolId,
        name: newClass.name,
        grade_level: newClass.grade_level,
        section: newClass.section || null,
        academic_year: newClass.academic_year,
        class_teacher_id: newClass.class_teacher_id || null,
        max_students: newClass.max_students,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Class created successfully',
      });

      setShowCreateDialog(false);
      setNewClass({
        name: '',
        grade_level: '',
        section: '',
        academic_year: '2025-2026',
        class_teacher_id: '',
        max_students: 40,
      });
      fetchClasses();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create class',
      });
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!selectedClass) return;

    try {
      // Check if student is already in a class for this academic year
      const { data: existing } = await supabase
        .from('class_students')
        .select('id, class_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .single();

      if (existing) {
        const existingClass = classes.find(c => c.id === existing.class_id);
        toast({
          variant: 'destructive',
          title: 'Already Enrolled',
          description: `Student is already in ${existingClass?.name || 'another class'}`,
        });
        return;
      }

      const nextRollNumber = classStudents.length + 1;

      const { error } = await supabase.from('class_students').insert({
        class_id: selectedClass.id,
        student_id: studentId,
        roll_number: nextRollNumber,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student assigned to class',
      });

      fetchClassStudents(selectedClass.id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to assign student',
      });
    }
  };

  const handleRemoveStudent = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from('class_students')
        .update({ status: 'dropped' })
        .eq('id', enrollmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student removed from class',
      });

      if (selectedClass) {
        fetchClassStudents(selectedClass.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove student',
      });
    }
  };

  const handlePromoteStudents = async () => {
    if (!targetClassForPromotion || selectedStudentsToPromote.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select target class and students',
      });
      return;
    }

    try {
      // Update old enrollments
      const { error: updateError } = await supabase
        .from('class_students')
        .update({
          status: 'promoted',
          promoted_to_class_id: targetClassForPromotion,
          promoted_at: new Date().toISOString(),
        })
        .in('id', selectedStudentsToPromote);

      if (updateError) throw updateError;

      // Get student IDs from enrollment IDs
      const studentsToPromote = classStudents.filter(s => selectedStudentsToPromote.includes(s.id));
      
      // Create new enrollments in target class
      const { data: existingInTarget } = await supabase
        .from('class_students')
        .select('student_id')
        .eq('class_id', targetClassForPromotion)
        .eq('status', 'active');

      const existingIds = new Set((existingInTarget || []).map(e => e.student_id));
      const newEnrollments = studentsToPromote
        .filter(s => !existingIds.has(s.student_id))
        .map((s, index) => ({
          class_id: targetClassForPromotion,
          student_id: s.student_id,
          roll_number: (existingInTarget?.length || 0) + index + 1,
        }));

      if (newEnrollments.length > 0) {
        const { error: insertError } = await supabase
          .from('class_students')
          .insert(newEnrollments);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: `Promoted ${selectedStudentsToPromote.length} students`,
      });

      setShowPromoteDialog(false);
      setSelectedStudentsToPromote([]);
      setTargetClassForPromotion('');
      if (selectedClass) {
        fetchClassStudents(selectedClass.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to promote students',
      });
    }
  };

  const handleAssignClassTeacher = async (teacherId: string) => {
    if (!selectedClass) return;

    try {
      const { error } = await supabase
        .from('classes')
        .update({ class_teacher_id: teacherId || null })
        .eq('id', selectedClass.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: teacherId ? 'Class teacher assigned' : 'Class teacher removed',
      });

      fetchClasses();
      setSelectedClass({ ...selectedClass, class_teacher_id: teacherId || null });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to assign class teacher',
      });
    }
  };

  const filteredClasses = useMemo(() => {
    return classes.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.grade_level.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classes, searchQuery]);

  const unassignedStudents = useMemo(() => {
    const enrolledIds = new Set(classStudents.map(s => s.student_id));
    return availableStudents.filter(s => !enrolledIds.has(s.id));
  }, [availableStudents, classStudents]);

  const classTeacher = useMemo(() => {
    if (!selectedClass?.class_teacher_id) return null;
    return teachers.find(t => t.id === selectedClass.class_teacher_id);
  }, [selectedClass, teachers]);

  const otherClasses = useMemo(() => {
    return classes.filter(c => c.id !== selectedClass?.id);
  }, [classes, selectedClass]);

  if (!schoolId && userRole !== 'platform_admin') {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <School className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              You must be assigned to a school to manage classes
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
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            Classes Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage classes, assign students and teachers
          </p>
        </div>

        {canManage && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Set up a new class for your school
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Class Name *</Label>
                  <Input
                    id="className"
                    placeholder="e.g., Grade 5 - Section A"
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Grade Level *</Label>
                    <Select
                      value={newClass.grade_level}
                      onValueChange={(v) => setNewClass({ ...newClass, grade_level: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select
                      value={newClass.section}
                      onValueChange={(v) => setNewClass({ ...newClass, section: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Class Teacher</Label>
                  <Select
                    value={newClass.class_teacher_id}
                    onValueChange={(v) => setNewClass({ ...newClass, class_teacher_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.display_name || t.username || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Max Students</Label>
                  <Input
                    id="maxStudents"
                    type="number"
                    value={newClass.max_students}
                    onChange={(e) => setNewClass({ ...newClass, max_students: parseInt(e.target.value) || 40 })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateClass}>Create Class</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Classes ({filteredClasses.length})
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-3">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {classes.length === 0 ? 'No classes created yet' : 'No matching classes'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClasses.map((cls, index) => (
                    <motion.button
                      key={cls.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedClass(cls)}
                      className={cn(
                        'w-full p-3 rounded-lg border text-left transition-all',
                        selectedClass?.id === cls.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border/50 hover:bg-secondary/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className={cn(
                            'text-xs',
                            selectedClass?.id === cls.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          )}>
                            {cls.grade_level}{cls.section ? ` - ${cls.section}` : ''}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Class Details */}
        <Card className="border-border/50 lg:col-span-2">
          {selectedClass ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedClass.name}</CardTitle>
                    <CardDescription>
                      {selectedClass.grade_level}{selectedClass.section ? ` - Section ${selectedClass.section}` : ''} • {selectedClass.academic_year}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{classStudents.length} / {selectedClass.max_students} students</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="students" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="students" className="gap-2">
                      <Users className="h-4 w-4" />
                      Students
                    </TabsTrigger>
                    <TabsTrigger value="teacher" className="gap-2">
                      <UserCheck className="h-4 w-4" />
                      Class Teacher
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="students" className="mt-4 space-y-4">
                    {/* Actions */}
                    {canManage && (
                      <div className="flex gap-2 flex-wrap">
                        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2">
                              <UserPlus className="h-4 w-4" />
                              Assign Student
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Assign Student to Class</DialogTitle>
                              <DialogDescription>
                                Select a student to add to {selectedClass.name}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[400px] pr-3">
                              {unassignedStudents.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">
                                  No unassigned students available
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {unassignedStudents.map(student => (
                                    <div
                                      key={student.id}
                                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-secondary/50"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={student.avatar_url || undefined} />
                                          <AvatarFallback>
                                            {(student.display_name || student.username || 'U').charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">
                                          {student.display_name || student.username || 'Unknown'}
                                        </span>
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          handleAssignStudent(student.id);
                                          setShowAssignDialog(false);
                                        }}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>

                        {classStudents.length > 0 && (
                          <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-2">
                                <ArrowUpRight className="h-4 w-4" />
                                Promote Students
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Promote Students</DialogTitle>
                                <DialogDescription>
                                  Select students and target class for promotion
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Target Class</Label>
                                  <Select
                                    value={targetClassForPromotion}
                                    onValueChange={setTargetClassForPromotion}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select target class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {otherClasses.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {c.name} ({c.grade_level})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Select Students</Label>
                                  <ScrollArea className="max-h-[300px] pr-3 border rounded-lg p-2">
                                    {classStudents.map(student => (
                                      <div
                                        key={student.id}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50"
                                      >
                                        <Checkbox
                                          checked={selectedStudentsToPromote.includes(student.id)}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setSelectedStudentsToPromote([...selectedStudentsToPromote, student.id]);
                                            } else {
                                              setSelectedStudentsToPromote(selectedStudentsToPromote.filter(id => id !== student.id));
                                            }
                                          }}
                                        />
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={student.profile?.avatar_url || undefined} />
                                          <AvatarFallback>
                                            {(student.profile?.display_name || student.profile?.username || 'U').charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span>
                                          {student.profile?.display_name || student.profile?.username || 'Unknown'}
                                        </span>
                                        {student.roll_number && (
                                          <Badge variant="outline" className="ml-auto">
                                            Roll #{student.roll_number}
                                          </Badge>
                                        )}
                                      </div>
                                    ))}
                                  </ScrollArea>
                                </div>
                              </div>

                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handlePromoteStudents}
                                  disabled={!targetClassForPromotion || selectedStudentsToPromote.length === 0}
                                >
                                  Promote {selectedStudentsToPromote.length} Students
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    )}

                    {/* Students List */}
                    <ScrollArea className="h-[350px] pr-3">
                      {studentsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                          ))}
                        </div>
                      ) : classStudents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No students assigned to this class
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {classStudents.map((student, index) => (
                            <motion.div
                              key={student.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card"
                            >
                              {student.roll_number && (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                                  {student.roll_number}
                                </div>
                              )}
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={student.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {(student.profile?.display_name || student.profile?.username || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {student.profile?.display_name || student.profile?.username || 'Unknown'}
                                </p>
                              </div>
                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveStudent(student.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="teacher" className="mt-4 space-y-4">
                    <div className="p-4 rounded-lg border border-border/50 bg-card">
                      {classTeacher ? (
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={classTeacher.avatar_url || undefined} />
                            <AvatarFallback>
                              {(classTeacher.display_name || classTeacher.username || 'T').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-lg">
                              {classTeacher.display_name || classTeacher.username || 'Unknown'}
                            </p>
                            <Badge variant="secondary">Class Teacher</Badge>
                          </div>
                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignClassTeacher('')}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">No class teacher assigned</p>
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div className="space-y-2">
                        <Label>Assign Class Teacher</Label>
                        <Select
                          value={selectedClass.class_teacher_id || ''}
                          onValueChange={handleAssignClassTeacher}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.display_name || t.username || 'Unknown'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-16">
              <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Select a class to view details
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
