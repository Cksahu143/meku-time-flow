import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Search, ChevronDown, Check, Crown, GraduationCap, BookOpen, Building, Plus, TestTube, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRBACContext } from '@/contexts/RBACContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
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
import { AppRole, ROLE_CONFIG } from '@/hooks/useRBAC';

interface UserWithRole {
  user_id: string;
  role: AppRole;
  school_id: string | null;
  school_name?: string | null;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  username: string | null;
}

interface School {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  student: <GraduationCap className="h-4 w-4" />,
  teacher: <BookOpen className="h-4 w-4" />,
  school_admin: <Building className="h-4 w-4" />,
  platform_admin: <Crown className="h-4 w-4" />,
};

export function RoleManagementView() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testResults, setTestResults] = useState<{ success: boolean; message: string }[]>([]);
  const [testing, setTesting] = useState(false);
  const [showAddSchoolDialog, setShowAddSchoolDialog] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', code: '', email: '' });
  const { toast } = useToast();
  const { hasPermission, userRole, schoolId, refreshRole } = useRBACContext();

  const isPlatformAdmin = userRole === 'platform_admin';
  const isSchoolAdmin = userRole === 'school_admin';
  const canManageRoles = hasPermission('can_change_any_role') || isPlatformAdmin;
  const canManageSchoolRoles = isSchoolAdmin && hasPermission('can_manage_students');

  useEffect(() => {
    fetchUsers();
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch user roles with profiles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          school_id
        `)
        .order('role');

      if (rolesError) throw rolesError;

      // Fetch profiles separately
      const userIds = rolesData?.map(r => r.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url, username')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fetch schools for names
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name');

      const schoolMap = new Map(schoolsData?.map(s => [s.id, s.name]) || []);
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const formattedUsers: UserWithRole[] = (rolesData || []).map((item: any) => {
        const profile = profileMap.get(item.user_id);
        return {
          user_id: item.user_id,
          role: item.role as AppRole,
          school_id: item.school_id,
          school_name: item.school_id ? schoolMap.get(item.school_id) : null,
          display_name: profile?.display_name || null,
          email: profile?.email || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          username: profile?.username || null,
        };
      });

      // Filter for school admins - only show users in their school
      if (isSchoolAdmin && schoolId) {
        setUsers(formattedUsers.filter(u => u.school_id === schoolId || !u.school_id));
      } else {
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole, newSchoolId?: string | null) => {
    if (!canManageRoles && !canManageSchoolRoles) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: "You don't have permission to change roles",
      });
      return;
    }

    // School admins can only assign student/teacher roles
    if (isSchoolAdmin && !isPlatformAdmin && !['student', 'teacher'].includes(newRole)) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: "You can only assign Student or Teacher roles",
      });
      return;
    }

    try {
      setUpdating(userId);

      const updateData: any = { role: newRole, updated_at: new Date().toISOString() };
      
      // Handle school assignment
      if (newSchoolId !== undefined) {
        updateData.school_id = newSchoolId;
      }

      const { error } = await supabase
        .from('user_roles')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev =>
        prev.map(user =>
          user.user_id === userId 
            ? { 
                ...user, 
                role: newRole, 
                school_id: newSchoolId !== undefined ? newSchoolId : user.school_id,
                school_name: newSchoolId ? schools.find(s => s.id === newSchoolId)?.name : user.school_name
              } 
            : user
        )
      );

      toast({
        title: 'Role Updated',
        description: `User role changed to ${ROLE_CONFIG[newRole].label}`,
      });

      // Refresh the current user's role if they changed their own
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === userId) {
        refreshRole();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update role',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleAssignSchool = async (userId: string, schoolId: string | null) => {
    try {
      setUpdating(userId);

      const { error } = await supabase
        .from('user_roles')
        .update({ school_id: schoolId, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev =>
        prev.map(user =>
          user.user_id === userId 
            ? { 
                ...user, 
                school_id: schoolId,
                school_name: schoolId ? schools.find(s => s.id === schoolId)?.name : null
              } 
            : user
        )
      );

      toast({
        title: 'School Assigned',
        description: schoolId ? 'User assigned to school' : 'User removed from school',
      });
    } catch (error) {
      console.error('Error assigning school:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to assign school',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleAddSchool = async () => {
    if (!newSchool.name || !newSchool.code) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'School name and code are required',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .insert({
          name: newSchool.name,
          code: newSchool.code.toUpperCase(),
          email: newSchool.email || null,
        });

      if (error) throw error;

      toast({
        title: 'School Created',
        description: `${newSchool.name} has been created`,
      });

      setShowAddSchoolDialog(false);
      setNewSchool({ name: '', code: '', email: '' });
      fetchSchools();
    } catch (error: any) {
      console.error('Error creating school:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message?.includes('unique') ? 'School code already exists' : 'Failed to create school',
      });
    }
  };

  const runPermissionTests = async () => {
    setTesting(true);
    setTestResults([]);
    const results: { success: boolean; message: string }[] = [];

    try {
      // Test 1: Check if user roles table is accessible
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .limit(1);
      
      results.push({
        success: !roleError,
        message: roleError ? `Failed to read roles: ${roleError.message}` : 'Can read user roles ✓'
      });

      // Test 2: Check if permissions are loaded
      const { data: permData, error: permError } = await supabase
        .from('permissions')
        .select('name')
        .limit(5);
      
      results.push({
        success: !permError && (permData?.length || 0) > 0,
        message: permError ? `Failed to read permissions: ${permError.message}` : `Loaded ${permData?.length} permissions ✓`
      });

      // Test 3: Check current user's role
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentRole, error: currentRoleError } = await supabase
          .from('user_roles')
          .select('role, school_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        results.push({
          success: !currentRoleError && !!currentRole,
          message: currentRoleError
            ? `Failed to get current user role: ${currentRoleError.message}`
            : currentRole
              ? `Current user role: ${currentRole.role} ${currentRole.school_id ? `(School: ${currentRole.school_id.substring(0, 8)}...)` : '(No school)'} ✓`
              : 'No role row found for current user'
        });
      }

      // Test 4: Check schools table
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .limit(5);
      
      results.push({
        success: !schoolError,
        message: schoolError ? `Failed to read schools: ${schoolError.message}` : `Found ${schoolData?.length || 0} schools ✓`
      });

      // Test 5: Verify RBAC context
      results.push({
        success: !!userRole,
        message: userRole ? `RBAC context loaded: ${userRole} ✓` : 'RBAC context not loaded'
      });

    } catch (error: any) {
      results.push({
        success: false,
        message: `Test error: ${error.message}`
      });
    }

    setTestResults(results);
    setTesting(false);
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      user.email.toLowerCase().includes(searchLower) ||
      (user.display_name?.toLowerCase().includes(searchLower)) ||
      (user.username?.toLowerCase().includes(searchLower)) ||
      user.role.toLowerCase().includes(searchLower)
    );

    const matchesSchool = selectedSchoolFilter === 'all' || 
      (selectedSchoolFilter === 'none' && !user.school_id) ||
      user.school_id === selectedSchoolFilter;

    return matchesSearch && matchesSchool;
  });

  const roleStats = {
    platform_admin: users.filter(u => u.role === 'platform_admin').length,
    school_admin: users.filter(u => u.role === 'school_admin').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    student: users.filter(u => u.role === 'student').length,
  };

  // Determine which roles can be assigned based on current user's role
  const assignableRoles: AppRole[] = isPlatformAdmin 
    ? ['student', 'teacher', 'school_admin', 'platform_admin']
    : isSchoolAdmin 
      ? ['student', 'teacher']
      : [];

  if (!canManageRoles && !canManageSchoolRoles) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to manage user roles. Only Platform Admins and School Admins can access this feature.
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
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
              <p className="text-muted-foreground text-sm">
                {isPlatformAdmin ? 'Manage all user roles and schools' : 'Manage users in your school'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <TestTube className="h-4 w-4" />
                  Test RBAC
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>RBAC Permission Tests</DialogTitle>
                  <DialogDescription>
                    Run tests to verify role-based access control is working correctly.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4">
                  {testResults.length === 0 && !testing && (
                    <p className="text-muted-foreground text-sm text-center">Click "Run Tests" to verify permissions</p>
                  )}
                  {testing && (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Running tests...</span>
                    </div>
                  )}
                  {testResults.map((result, i) => (
                    <div key={i} className={`p-3 rounded-lg ${result.success ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                      {result.message}
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button onClick={runPermissionTests} disabled={testing}>
                    {testing ? 'Running...' : 'Run Tests'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {isPlatformAdmin && (
              <Dialog open={showAddSchoolDialog} onOpenChange={setShowAddSchoolDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add School
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New School</DialogTitle>
                    <DialogDescription>
                      Add a new school to the platform.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="school-name">School Name *</Label>
                      <Input
                        id="school-name"
                        placeholder="Enter school name"
                        value={newSchool.name}
                        onChange={(e) => setNewSchool(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-code">School Code *</Label>
                      <Input
                        id="school-code"
                        placeholder="e.g., SCH001"
                        value={newSchool.code}
                        onChange={(e) => setNewSchool(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="school-email">School Email</Label>
                      <Input
                        id="school-email"
                        type="email"
                        placeholder="admin@school.edu"
                        value={newSchool.email}
                        onChange={(e) => setNewSchool(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddSchoolDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSchool}>Create School</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {(Object.entries(roleStats) as [AppRole, number][]).map(([role, count]) => (
          <Card key={role} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{ROLE_CONFIG[role].label}s</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <div className={`p-2 rounded-lg ${ROLE_CONFIG[role].bgColor}`}>
                  {ROLE_ICONS[role]}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Schools Overview (Platform Admin Only) */}
      {isPlatformAdmin && schools.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5" />
                Schools ({schools.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {schools.map(school => (
                  <Badge key={school.id} variant="secondary" className="gap-1">
                    {school.name}
                    <span className="text-muted-foreground">({school.code})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search and Table */}
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
                  <Users className="h-5 w-5" />
                  All Users
                </CardTitle>
                <CardDescription>
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {isPlatformAdmin && schools.length > 0 && (
                  <Select value={selectedSchoolFilter} onValueChange={setSelectedSchoolFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by school" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schools</SelectItem>
                      <SelectItem value="none">No School</SelectItem>
                      {schools.map(school => (
                        <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="icon" onClick={fetchUsers}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {(user.display_name || user.username || user.email).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {user.display_name || user.username || 'No name'}
                              </p>
                              <p className="text-xs text-muted-foreground">@{user.username || 'unknown'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`${ROLE_CONFIG[user.role].bgColor} ${ROLE_CONFIG[user.role].color} border-0`}
                          >
                            {ROLE_ICONS[user.role]}
                            <span className="ml-1">{ROLE_CONFIG[user.role].label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.school_name ? (
                            <Badge variant="outline" className="gap-1">
                              <Building className="h-3 w-3" />
                              {user.school_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No school</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Change Role Button */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updating === user.user_id}
                                  className="gap-1"
                                >
                                  {updating === user.user_id ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Shield className="h-3 w-3" />
                                      Change Role
                                      <ChevronDown className="h-3 w-3" />
                                    </>
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Assign Role</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {assignableRoles.map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    onClick={() => handleRoleChange(user.user_id, role)}
                                    className="flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={ROLE_CONFIG[role].color}>
                                        {ROLE_ICONS[role]}
                                      </span>
                                      {ROLE_CONFIG[role].label}
                                    </div>
                                    {user.role === role && (
                                      <Check className="h-4 w-4 text-primary" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Assign School Button - Platform Admin Only */}
                            {isPlatformAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={updating === user.user_id}
                                    className="gap-1"
                                  >
                                    <Building className="h-3 w-3" />
                                    Assign School
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Assign to School</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleAssignSchool(user.user_id, null)}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="text-muted-foreground">No School</span>
                                    {!user.school_id && <Check className="h-4 w-4 text-primary" />}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {schools.map((school) => (
                                    <DropdownMenuItem
                                      key={school.id}
                                      onClick={() => handleAssignSchool(user.user_id, school.id)}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Building className="h-3 w-3 text-muted-foreground" />
                                        {school.name}
                                      </div>
                                      {user.school_id === school.id && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                  {schools.length === 0 && (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                      No schools available
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No users found matching your search
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
