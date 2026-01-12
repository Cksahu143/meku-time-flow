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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, school_id')
        .eq('user_id', user.id)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        // Default to student if no role found
        setUserRole('student');
      } else if (roleData) {
        setUserRole(roleData.role as AppRole);
        setSchoolId(roleData.school_id);
      }

      // Fetch permissions for the user's role
      const { data: permData, error: permError } = await supabase
        .from('role_permissions')
        .select(`
          permissions (name)
        `)
        .eq('role', roleData?.role || 'student');

      if (!permError && permData) {
        const permNames = permData
          .map((p: any) => p.permissions?.name)
          .filter(Boolean);
        setPermissions(permNames);
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole('student');
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
    };

    const permission = viewPermissionMap[view];
    if (!permission) return false;
    return hasPermission(permission);
  }, [hasPermission]);

  // Get role configuration for display
  const getRoleConfig = useCallback(() => {
    if (!userRole) return null;
    return ROLE_CONFIG[userRole];
  }, [userRole]);

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