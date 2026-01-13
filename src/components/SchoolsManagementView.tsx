import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  GraduationCap, 
  BookOpen, 
  RefreshCw, 
  Crown,
  Settings,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Clock,
  ListTodo,
  Timer,
  MessageSquare,
  Mic,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  CreditCard,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRBACContext } from '@/contexts/RBACContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface School {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  subscription_tier: string;
  subscription_expires_at: string | null;
  max_students: number;
  max_teachers: number;
  features_enabled: FeatureToggles;
  created_at: string;
  student_count?: number;
  teacher_count?: number;
  school_admin_count?: number;
}

interface FeatureToggles {
  timetable: boolean;
  calendar: boolean;
  todo: boolean;
  pomodoro: boolean;
  groups: boolean;
  resources: boolean;
  transcribe: boolean;
}

const SUBSCRIPTION_TIERS = [
  { value: 'free', label: 'Free', color: 'bg-gray-100 text-gray-700', maxStudents: 50, maxTeachers: 10 },
  { value: 'basic', label: 'Basic', color: 'bg-blue-100 text-blue-700', maxStudents: 200, maxTeachers: 30 },
  { value: 'premium', label: 'Premium', color: 'bg-purple-100 text-purple-700', maxStudents: 500, maxTeachers: 100 },
  { value: 'enterprise', label: 'Enterprise', color: 'bg-amber-100 text-amber-700', maxStudents: 10000, maxTeachers: 1000 },
];

const FEATURE_LIST = [
  { key: 'timetable', label: 'Timetable', icon: Clock },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'todo', label: 'To-Do List', icon: ListTodo },
  { key: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { key: 'groups', label: 'Study Chat', icon: MessageSquare },
  { key: 'resources', label: 'Resources', icon: BookOpen },
  { key: 'transcribe', label: 'Transcribe', icon: Mic },
] as const;

const defaultFeatures: FeatureToggles = {
  timetable: true,
  calendar: true,
  todo: true,
  pomodoro: true,
  groups: true,
  resources: true,
  transcribe: false,
};

export function SchoolsManagementView() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { hasPermission, userRole } = useRBACContext();

  const isPlatformAdmin = userRole === 'platform_admin';

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    subscription_tier: 'free',
    max_students: 50,
    max_teachers: 10,
    features_enabled: defaultFeatures,
  });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (schoolsError) throw schoolsError;

      // Get user counts for each school
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('school_id, role');

      if (roleError) throw roleError;

      const schoolsWithCounts = (schoolsData || []).map(school => {
        const schoolUsers = roleData?.filter(r => r.school_id === school.id) || [];
        const features = school.features_enabled as unknown as FeatureToggles;
        return {
          ...school,
          features_enabled: features || defaultFeatures,
          student_count: schoolUsers.filter(u => u.role === 'student').length,
          teacher_count: schoolUsers.filter(u => u.role === 'teacher').length,
          school_admin_count: schoolUsers.filter(u => u.role === 'school_admin').length,
        };
      });

      setSchools(schoolsWithCounts);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load schools',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async () => {
    if (!formData.name || !formData.code) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'School name and code are required',
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('schools')
        .insert([{
          name: formData.name,
          code: formData.code.toUpperCase(),
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          subscription_tier: formData.subscription_tier,
          max_students: formData.max_students,
          max_teachers: formData.max_teachers,
          features_enabled: JSON.parse(JSON.stringify(formData.features_enabled)),
        }]);

      if (error) throw error;

      toast({
        title: 'School Created',
        description: `${formData.name} has been created successfully`,
      });

      setShowCreateDialog(false);
      resetForm();
      fetchSchools();
    } catch (error: any) {
      console.error('Error creating school:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message?.includes('unique') ? 'School code already exists' : 'Failed to create school',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSchool = async () => {
    if (!selectedSchool) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('schools')
        .update({
          name: formData.name,
          code: formData.code.toUpperCase(),
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          subscription_tier: formData.subscription_tier,
          max_students: formData.max_students,
          max_teachers: formData.max_teachers,
          features_enabled: JSON.parse(JSON.stringify(formData.features_enabled)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSchool.id);

      if (error) throw error;

      toast({
        title: 'School Updated',
        description: `${formData.name} has been updated`,
      });

      setShowEditDialog(false);
      setSelectedSchool(null);
      fetchSchools();
    } catch (error: any) {
      console.error('Error updating school:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message?.includes('unique') ? 'School code already exists' : 'Failed to update school',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (school: School) => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({ is_active: !school.is_active, updated_at: new Date().toISOString() })
        .eq('id', school.id);

      if (error) throw error;

      setSchools(prev =>
        prev.map(s => s.id === school.id ? { ...s, is_active: !s.is_active } : s)
      );

      toast({
        title: school.is_active ? 'School Deactivated' : 'School Activated',
        description: `${school.name} has been ${school.is_active ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      console.error('Error toggling school:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update school status',
      });
    }
  };

  const handleDeleteSchool = async (school: School) => {
    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', school.id);

      if (error) throw error;

      setSchools(prev => prev.filter(s => s.id !== school.id));

      toast({
        title: 'School Deleted',
        description: `${school.name} has been deleted`,
      });
    } catch (error) {
      console.error('Error deleting school:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete school. Make sure no users are assigned to it.',
      });
    }
  };

  const handleFeatureToggle = (feature: keyof FeatureToggles) => {
    setFormData(prev => ({
      ...prev,
      features_enabled: {
        ...prev.features_enabled,
        [feature]: !prev.features_enabled[feature],
      },
    }));
  };

  const openEditDialog = (school: School) => {
    setSelectedSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      email: school.email || '',
      phone: school.phone || '',
      address: school.address || '',
      subscription_tier: school.subscription_tier,
      max_students: school.max_students,
      max_teachers: school.max_teachers,
      features_enabled: school.features_enabled || defaultFeatures,
    });
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      subscription_tier: 'free',
      max_students: 50,
      max_teachers: 10,
      features_enabled: defaultFeatures,
    });
  };

  const handleSubscriptionChange = (tier: string) => {
    const tierConfig = SUBSCRIPTION_TIERS.find(t => t.value === tier);
    setFormData(prev => ({
      ...prev,
      subscription_tier: tier,
      max_students: tierConfig?.maxStudents || 50,
      max_teachers: tierConfig?.maxTeachers || 10,
    }));
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    school.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (school.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalStats = {
    schools: schools.length,
    activeSchools: schools.filter(s => s.is_active).length,
    totalStudents: schools.reduce((sum, s) => sum + (s.student_count || 0), 0),
    totalTeachers: schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0),
  };

  if (!isPlatformAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Only Platform Admins can access Schools Management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Schools Management</h1>
              <p className="text-muted-foreground text-sm">
                Create, edit, and manage all schools on the platform
              </p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Create School
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Schools</p>
                <p className="text-2xl font-bold">{totalStats.schools}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Schools</p>
                <p className="text-2xl font-bold">{totalStats.activeSchools}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{totalStats.totalStudents}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="text-2xl font-bold">{totalStats.totalTeachers}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <BookOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Schools Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  All Schools
                </CardTitle>
                <CardDescription>
                  {filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search schools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchSchools}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No schools found</p>
                <Button onClick={() => setShowCreateDialog(true)} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create First School
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSchools.map(school => (
                  <Collapsible
                    key={school.id}
                    open={expandedSchool === school.id}
                    onOpenChange={() => setExpandedSchool(expandedSchool === school.id ? null : school.id)}
                  >
                    <Card className={`transition-all ${!school.is_active ? 'opacity-60' : ''}`}>
                      <CollapsibleTrigger asChild>
                        <div className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 rounded-lg">
                                <AvatarImage src={school.logo_url || undefined} />
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                                  {school.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{school.name}</h3>
                                  <Badge variant="outline" className="text-xs">
                                    {school.code}
                                  </Badge>
                                  {!school.is_active && (
                                    <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <GraduationCap className="h-3 w-3" />
                                    {school.student_count} students
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {school.teacher_count} teachers
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Crown className="h-3 w-3" />
                                    {school.school_admin_count} admins
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={SUBSCRIPTION_TIERS.find(t => t.value === school.subscription_tier)?.color || 'bg-gray-100'}>
                                {SUBSCRIPTION_TIERS.find(t => t.value === school.subscription_tier)?.label || 'Free'}
                              </Badge>
                              {expandedSchool === school.id ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t pt-4">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* School Details */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
                              {school.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  {school.email}
                                </div>
                              )}
                              {school.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  {school.phone}
                                </div>
                              )}
                              {school.address && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  {school.address}
                                </div>
                              )}
                              {!school.email && !school.phone && !school.address && (
                                <p className="text-sm text-muted-foreground italic">No contact information</p>
                              )}
                            </div>

                            {/* Features & Limits */}
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm text-muted-foreground">Features & Limits</h4>
                              <div className="flex flex-wrap gap-2">
                                {FEATURE_LIST.map(feature => {
                                  const isEnabled = school.features_enabled?.[feature.key as keyof FeatureToggles];
                                  return (
                                    <Badge
                                      key={feature.key}
                                      variant={isEnabled ? 'default' : 'secondary'}
                                      className={`gap-1 ${isEnabled ? '' : 'opacity-50'}`}
                                    >
                                      <feature.icon className="h-3 w-3" />
                                      {feature.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>Max Students: {school.max_students}</span>
                                <span>Max Teachers: {school.max_teachers}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                            <Button variant="outline" size="sm" onClick={() => handleToggleActive(school)}>
                              {school.is_active ? (
                                <>
                                  <ToggleRight className="h-4 w-4 mr-1" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 mr-1" />
                                  Activate
                                </>
                              )}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(school)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete School</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {school.name}? This action cannot be undone.
                                    All users must be unassigned from this school first.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteSchool(school)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create School Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New School</DialogTitle>
            <DialogDescription>
              Add a new school to the platform with subscription and feature settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">School Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter school name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">School Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., SCH001"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.edu"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="School address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            {/* Subscription */}
            <div className="space-y-3">
              <Label>Subscription Tier</Label>
              <Select value={formData.subscription_tier} onValueChange={handleSubscriptionChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_TIERS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${tier.color}`}>{tier.label}</span>
                        <span className="text-muted-foreground">
                          Up to {tier.maxStudents} students, {tier.maxTeachers} teachers
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_students">Max Students</Label>
                <Input
                  id="max_students"
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_teachers">Max Teachers</Label>
                <Input
                  id="max_teachers"
                  type="number"
                  value={formData.max_teachers}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_teachers: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="space-y-3">
              <Label>Features Enabled</Label>
              <div className="grid grid-cols-2 gap-3">
                {FEATURE_LIST.map(feature => (
                  <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <feature.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{feature.label}</span>
                    </div>
                    <Switch
                      checked={formData.features_enabled[feature.key as keyof FeatureToggles]}
                      onCheckedChange={() => handleFeatureToggle(feature.key as keyof FeatureToggles)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSchool} disabled={saving}>
              {saving ? 'Creating...' : 'Create School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>
              Update school information, subscription, and features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Same form fields as create */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">School Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code">School Code *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Subscription Tier</Label>
              <Select value={formData.subscription_tier} onValueChange={handleSubscriptionChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_TIERS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${tier.color}`}>{tier.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max_students">Max Students</Label>
                <Input
                  id="edit-max_students"
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_students: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_teachers">Max Teachers</Label>
                <Input
                  id="edit-max_teachers"
                  type="number"
                  value={formData.max_teachers}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_teachers: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Features Enabled</Label>
              <div className="grid grid-cols-2 gap-3">
                {FEATURE_LIST.map(feature => (
                  <div key={feature.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <feature.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{feature.label}</span>
                    </div>
                    <Switch
                      checked={formData.features_enabled[feature.key as keyof FeatureToggles]}
                      onCheckedChange={() => handleFeatureToggle(feature.key as keyof FeatureToggles)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateSchool} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
