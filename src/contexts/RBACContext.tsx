import React, { createContext, useContext, ReactNode } from 'react';
import { useRBAC, AppRole } from '@/hooks/useRBAC';

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
    throw new Error('useRBACContext must be used within a RBACProvider');
  }
  return context;
}