import React from 'react';
import { useRBAC, AppRole } from '@/hooks/useRBAC';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  permission?: string;
  role?: AppRole;
  minimumRole?: AppRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showTooltip?: boolean;
  tooltipMessage?: string;
}

export function PermissionGuard({
  permission,
  role,
  minimumRole,
  children,
  fallback,
  showTooltip = true,
  tooltipMessage = "You don't have permission to do this",
}: PermissionGuardProps) {
  const { hasPermission, hasRole, hasMinimumRole, loading } = useRBAC();

  if (loading) {
    return null;
  }

  let isAllowed = true;

  if (permission) {
    isAllowed = hasPermission(permission);
  } else if (role) {
    isAllowed = hasRole(role);
  } else if (minimumRole) {
    isAllowed = hasMinimumRole(minimumRole);
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex opacity-50 cursor-not-allowed">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <Lock className="h-3 w-3" />
          {tooltipMessage}
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}

// HOC for wrapping components with permission check
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string
) {
  return function WithPermissionComponent(props: P) {
    return (
      <PermissionGuard permission={permission}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}

// Hook for disabling elements based on permission
export function useDisabledByPermission(permission: string) {
  const { hasPermission, loading } = useRBAC();
  
  const isDisabled = !hasPermission(permission);
  const tooltipProps = isDisabled
    ? {
        title: "You don't have permission to do this",
        className: 'opacity-50 cursor-not-allowed',
      }
    : {};

  return { isDisabled, tooltipProps, loading };
}