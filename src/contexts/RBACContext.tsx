import React, { createContext, useContext, ReactNode } from 'react';
import { useRBAC, AppRole, ROLE_CONFIG } from '@/hooks/useRBAC';

interface RBACContextValue {
  userRole: AppRole | null;
  permissions: string[];
  loading: boolean;
  schoolId: string | null;
  hasPermission: (permissionName: string) => boolean;
  hasRole: (role: AppRole) => boolean;
  hasMinimumRole: (minRole: AppRole) => boolean;
  canAccessView: (view: string) => boolean;
  getRoleConfig: () => { label: string; color: string; bgColor: string } | null;
  canManageUsers: () => boolean;
  refreshRole: () => Promise<void>;
}

const RBACContext = createContext<RBACContextValue | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const rbac = useRBAC();

  return (
    <RBACContext.Provider value={rbac}>
      {children}
    </RBACContext.Provider>
  );
}

export function useRBACContext() {
  const context = useContext(RBACContext);
  if (context === undefined) {
    // Return safe defaults instead of throwing — prevents blank screen on HMR / race conditions
    return {
      userRole: null,
      permissions: [],
      loading: true,
      schoolId: null,
      hasPermission: () => false,
      hasRole: () => false,
      hasMinimumRole: () => false,
      canAccessView: () => false,
      getRoleConfig: () => null,
      canManageUsers: () => false,
      refreshRole: async () => {},
    } as RBACContextValue;
  }
  return context;
}

// Re-export types and constants for convenience
export { ROLE_CONFIG };
export type { AppRole };