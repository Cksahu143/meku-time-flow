import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useRBAC, ROLE_CONFIG, AppRole } from '@/hooks/useRBAC';
import { cn } from '@/lib/utils';
import { Shield, GraduationCap, BookOpen, Building2, Crown } from 'lucide-react';

interface RoleBadgeProps {
  role?: AppRole;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ROLE_ICONS: Record<AppRole, React.ElementType> = {
  student: GraduationCap,
  teacher: BookOpen,
  school_admin: Building2,
  platform_admin: Crown,
};

export function RoleBadge({ role, showIcon = true, size = 'sm', className }: RoleBadgeProps) {
  const { userRole, loading } = useRBAC();
  
  const displayRole = role || userRole;
  
  if (loading || !displayRole) return null;
  
  const config = ROLE_CONFIG[displayRole];
  const Icon = ROLE_ICONS[displayRole];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium gap-1',
        config.bgColor,
        config.color,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}