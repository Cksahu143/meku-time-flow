import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Crown, GraduationCap, BookOpen, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ROLE_CONFIG, useRBACContext, type AppRole } from '@/contexts/RBACContext';

interface RoleBadgeProps {
  role?: AppRole;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

const ROLE_ICONS: Record<AppRole, React.ElementType> = {
  student: GraduationCap,
  teacher: BookOpen,
  school_admin: Building2,
  platform_admin: Crown,
};

// Use semantic design tokens only (no hard-coded colors)
const ROLE_GRADIENTS: Record<AppRole, string> = {
  student: 'from-secondary-foreground/70 to-primary',
  teacher: 'from-success to-primary',
  school_admin: 'from-accent-foreground to-primary',
  platform_admin: 'from-primary to-primary-glow',
};

export function RoleBadge({
  role,
  showIcon = true,
  size = 'sm',
  className,
  animated = false,
}: RoleBadgeProps) {
  const { userRole, loading } = useRBACContext();

  const displayRole = role || userRole;
  if (loading || !displayRole) return null;

  const config = ROLE_CONFIG[displayRole];
  const Icon = ROLE_ICONS[displayRole];
  const gradient = ROLE_GRADIENTS[displayRole];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const badge = (
    <Badge
      variant="secondary"
      className={cn(
        'font-semibold gap-1.5 border-0 text-primary-foreground shadow-sm',
        `bg-gradient-to-r ${gradient}`,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </Badge>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
}

// Detailed role card for prominent display
export function RoleCard({ className }: { className?: string }) {
  const { userRole, permissions, schoolId, loading } = useRBACContext();

  if (loading || !userRole) return null;

  const config = ROLE_CONFIG[userRole];
  const Icon = ROLE_ICONS[userRole];
  const gradient = ROLE_GRADIENTS[userRole];

  const roleDescriptions: Record<AppRole, string> = {
    student: 'Access your timetable, tasks, study groups, and learning resources',
    teacher: 'Manage classes, create timetables, and oversee student groups',
    school_admin: "Manage your school's users, classes, and administrative settings",
    platform_admin: 'Full platform access including all schools and system settings',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4 text-primary-foreground shadow-lg',
        `bg-gradient-to-br ${gradient}`,
        className
      )}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary-foreground/20 backdrop-blur-sm">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">{config.label}</h3>
          <p className="text-sm text-primary-foreground/80 mt-0.5">{roleDescriptions[userRole]}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">
              {permissions.length} permissions
            </span>
            {schoolId && (
              <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">
                School assigned
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
