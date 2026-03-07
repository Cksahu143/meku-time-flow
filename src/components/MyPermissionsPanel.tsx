import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRBACContext } from '@/contexts/RBACContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PermissionRow = {
  id: string;
  name: string;
  description: string | null;
};

function humanizePermissionName(name: string) {
  return name
    .replace(/^can_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MyPermissionsPanel({ className }: { className?: string }) {
  const { permissions: grantedPermissions, loading: rbacLoading } = useRBACContext();
  const [allPermissions, setAllPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: permError } = await supabase
          .from('permissions')
          .select('id, name, description')
          .order('name');

        if (permError) throw permError;
        if (!mounted) return;

        setAllPermissions((data ?? []) as PermissionRow[]);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'Failed to load permissions');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const granted = useMemo(() => new Set(grantedPermissions), [grantedPermissions]);
  const unlockedCount = useMemo(() => {
    if (!allPermissions.length) return grantedPermissions.length;
    return allPermissions.filter((p) => granted.has(p.name)).length;
  }, [allPermissions, granted, grantedPermissions.length]);

  const total = allPermissions.length || Math.max(grantedPermissions.length, 0);
  const progressPercent = total > 0 ? (unlockedCount / total) * 100 : 0;

  return (
    <Card className={cn('card-premium', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base font-bold">
          <motion.div 
            className="p-1.5 rounded-lg bg-primary/10"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Shield className="h-3.5 w-3.5 text-primary" />
          </motion.div>
          My Permissions
        </CardTitle>
        <CardDescription className="flex items-center gap-3">
          <span>Unlocked {unlockedCount}/{total}</span>
          {total > 0 && (
            <div className="flex-1 max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(rbacLoading || loading) && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/30 p-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {!rbacLoading && !loading && error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!rbacLoading && !loading && !error && allPermissions.length === 0 && (
          <motion.div 
            className="text-center py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shield className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            </motion.div>
            <p className="text-sm text-muted-foreground">No permissions configured yet.</p>
          </motion.div>
        )}

        {!rbacLoading && !loading && !error && allPermissions.length > 0 && (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allPermissions.map((p, i) => {
              const isUnlocked = granted.has(p.name);
              return (
                <motion.div
                  key={p.id}
                  className={cn(
                    'rounded-xl border p-3 transition-all duration-300',
                    isUnlocked 
                      ? 'border-primary/20 bg-primary/[0.03] hover:border-primary/30 hover:shadow-sm' 
                      : 'border-border/30 bg-card/50 opacity-60 hover:opacity-80'
                  )}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={isUnlocked ? 'default' : 'outline'}
                      className={cn(
                        'gap-1.5 text-xs',
                        isUnlocked
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {isUnlocked ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: i * 0.03 + 0.2 }}>
                          <Check className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {humanizePermissionName(p.name)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {p.description ?? 'No description set for this permission yet.'}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
