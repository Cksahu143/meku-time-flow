import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Search, ChevronDown, Check, Crown, GraduationCap, BookOpen, Building } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AppRole, ROLE_CONFIG } from '@/hooks/useRBAC';

interface UserWithRole {
  user_id: string;
  role: AppRole;
  school_id: string | null;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  username: string | null;
}

const ROLE_ICONS: Record<AppRole, React.ReactNode> = {
  student: <GraduationCap className="h-4 w-4" />,
  teacher: <BookOpen className="h-4 w-4" />,
  school_admin: <Building className="h-4 w-4" />,
  platform_admin: <Crown className="h-4 w-4" />,
};

export function RoleManagementView() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();
  const { hasPermission, userRole } = useRBACContext();

  const canManageRoles = hasPermission('can_change_any_role') || userRole === 'platform_admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          school_id,
          profiles!inner (
            display_name,
            email,
            avatar_url,
            username
          )
        `)
        .order('role');

      if (error) throw error;

      const formattedUsers: UserWithRole[] = (data || []).map((item: any) => ({
        user_id: item.user_id,
        role: item.role as AppRole,
        school_id: item.school_id,
        display_name: item.profiles?.display_name,
        email: item.profiles?.email,
        avatar_url: item.profiles?.avatar_url,
        username: item.profiles?.username,
      }));

      setUsers(formattedUsers);
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

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!canManageRoles) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: "You don't have permission to change roles",
      });
      return;
    }

    try {
      setUpdating(userId);

      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prev =>
        prev.map(user =>
          user.user_id === userId ? { ...user, role: newRole } : user
        )
      );

      toast({
        title: 'Role Updated',
        description: `User role changed to ${ROLE_CONFIG[newRole].label}`,
      });
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

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.display_name?.toLowerCase().includes(searchLower)) ||
      (user.username?.toLowerCase().includes(searchLower)) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  const roleStats = {
    platform_admin: users.filter(u => u.role === 'platform_admin').length,
    school_admin: users.filter(u => u.role === 'school_admin').length,
    teacher: users.filter(u => u.role === 'teacher').length,
    student: users.filter(u => u.role === 'student').length,
  };

  if (!canManageRoles) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You don't have permission to manage user roles. Only Platform Admins can access this feature.
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
            <p className="text-muted-foreground text-sm">Manage user roles and permissions</p>
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
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
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
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updating === user.user_id}
                                className="gap-1"
                              >
                                {updating === user.user_id ? (
                                  <span className="animate-spin">⏳</span>
                                ) : (
                                  <>
                                    Change Role
                                    <ChevronDown className="h-3 w-3" />
                                  </>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => (
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
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
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
