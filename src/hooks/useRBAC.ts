import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'student' | 'teacher' | 'school_admin' | 'platform_admin';

export interface UserRoleData {
  role: AppRole;
  school_id: string | null;
}

export interface Permission {
  name: string;
  description: string | null;
}

// Role display names and colors for UI
export const ROLE_CONFIG: Record<AppRole, { label: string; color: string; bgColor: string }> = {
  student: { label: 'Student', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  teacher: { label: 'Teacher', color: 'text-green-600', bgColor: 'bg-green-100' },
  school_admin: { label: 'School Admin', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  platform_admin: { label: 'Platform Admin', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

// Role hierarchy for permission inheritance
const ROLE_HIERARCHY: Record<AppRole, number> = {
  student: 1,
  teacher: 2,
  school_admin: 3,
  platform_admin: 4,
};

export function useRBAC() {
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const fetchUserRole = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserRole(null);
        setPermissions([]);
        setSchoolId(null);
        return;
      }

      // Resolve role + school in a way that's resilient to missing rows / RLS / .single() pitfalls
      let resolvedRole: AppRole = 'student';
      let resolvedSchoolId: string | null = null;

      const { data: roleRow, error: roleRowError } = await supabase
        .from('user_roles')
        .select('role, school_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleRowError) {
        console.error('Error fetching user role row:', roleRowError);
      }

      if (roleRow?.role) {
        resolvedRole = roleRow.role as AppRole;
        resolvedSchoolId = roleRow.school_id ?? null;
      } else {
        // Fallback: use backend function (bypasses table RLS) to at least get the role.
        const { data: rpcRole, error: rpcError } = await supabase.rpc('get_user_role', {
          _user_id: user.id,
        });

        if (rpcError) {
          console.error('Error fetching role via get_user_role():', rpcError);
        } else if (rpcRole) {
          resolvedRole = rpcRole as AppRole;
        }
      }

      setUserRole(resolvedRole);
      setSchoolId(resolvedSchoolId);

      // Fetch permissions for the resolved role
      const { data: permData, error: permError } = await supabase
        .from('role_permissions')
        .select(`permissions (name)`)
        .eq('role', resolvedRole);

      if (permError) {
        console.error('Error fetching role permissions:', permError);
        setPermissions([]);
      } else {
        const permNames = (permData ?? [])
          .map((p: any) => p.permissions?.name)
          .filter(Boolean);
        setPermissions(permNames);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole('student');
      setPermissions([]);
      setSchoolId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permissionName: string): boolean => {
    return permissions.includes(permissionName);
  }, [permissions]);

  // Check if user has a specific role
  const hasRole = useCallback((role: AppRole): boolean => {
    return userRole === role;
  }, [userRole]);

  // Check if user has at least the specified role level
  const hasMinimumRole = useCallback((minRole: AppRole): boolean => {
    if (!userRole) return false;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
  }, [userRole]);

  // Check if user can access a specific view
  const canAccessView = useCallback((view: string): boolean => {
    const viewPermissionMap: Record<string, string> = {
      dashboard: 'can_view_dashboard',
      timetable: 'can_view_timetable',
      calendar: 'can_view_calendar',
      todo: 'can_view_todo',
      pomodoro: 'can_view_pomodoro',
      groups: 'can_view_groups',
      resources: 'can_view_resources',
      transcribe: 'can_view_transcribe',
      'role-management': 'can_change_any_role',
      'schools-management': 'can_manage_schools',
      announcements: 'can_view_announcements',
      attendance: 'can_mark_attendance',
      analytics: 'can_view_analytics',
      'feature-toggles': 'can_toggle_features',
    };

    const permission = viewPermissionMap[view];
    if (!permission) return false;
    
    // Special case for role-management: school admins with manage permissions can access
    if (view === 'role-management') {
      if (hasPermission('can_change_any_role')) return true;
      if (userRole === 'platform_admin') return true;
      if (userRole === 'school_admin' && (hasPermission('can_manage_students') || hasPermission('can_manage_teachers'))) return true;
      return false;
    }
    
    // Special case for schools-management: platform admins can manage all, school admins can manage their own
    if (view === 'schools-management') {
      if (hasPermission('can_manage_schools')) return true;
      if (userRole === 'platform_admin') return true;
      if (userRole === 'school_admin' && schoolId) return true; // School admins can only manage their own school
      return false;
    }
    
    // Special case for announcements: teachers, school admins, and platform admins can access
    if (view === 'announcements') {
      if (hasPermission('can_view_announcements') || hasPermission('can_post_announcements')) return true;
      if (userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher') return true;
      return false;
    }
    
    // Special case for attendance: teachers, school admins, and platform admins can access
    if (view === 'attendance') {
      if (hasPermission('can_mark_attendance')) return true;
      if (userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher') return true;
      return false;
    }
    
    // Special case for analytics: school admins and platform admins can access
    if (view === 'analytics') {
      if (hasPermission('can_view_analytics') || hasPermission('can_view_platform_analytics')) return true;
      if (userRole === 'platform_admin' || userRole === 'school_admin') return true;
      return false;
    }
    
    // Special case for feature-toggles: platform admins can access
    if (view === 'feature-toggles') {
      if (hasPermission('can_toggle_features') || hasPermission('can_manage_features')) return true;
      if (userRole === 'platform_admin') return true;
      return false;
    }
    
    return hasPermission(permission);
  }, [hasPermission, userRole, schoolId]);

  // Get role configuration for display
  const getRoleConfig = useCallback(() => {
    if (!userRole) return null;
    return ROLE_CONFIG[userRole];
  }, [userRole]);

  // Check if user can manage users (school admins within their school, platform admins globally)
  const canManageUsers = useCallback((): boolean => {
    if (hasPermission('can_change_any_role')) return true;
    if (userRole === 'platform_admin') return true;
    if (userRole === 'school_admin' && hasPermission('can_manage_students')) return true;
    return false;
  }, [hasPermission, userRole]);

  return {
    userRole,
    permissions,
    loading,
    schoolId,
    hasPermission,
    hasRole,
    hasMinimumRole,
    canAccessView,
    getRoleConfig,
    canManageUsers,
    refreshRole: fetchUserRole,
  };
}

// Hook for checking permission with tooltip message
export function usePermissionCheck(permissionName: string) {
  const { hasPermission, loading } = useRBAC();
  
  const isAllowed = hasPermission(permissionName);
  const tooltipMessage = isAllowed ? undefined : "You don't have permission to do this";
  
  return { isAllowed, tooltipMessage, loading };
}