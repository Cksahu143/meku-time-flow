import React, { useEffect, useMemo, useState } from 'react';
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

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          My Permissions
        </CardTitle>
        <CardDescription>
          Unlocked {unlockedCount}/{total} (locked permissions show what you can’t do yet)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(rbacLoading || loading) && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border/50 p-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            ))}
          </div>
        )}

        {!rbacLoading && !loading && error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!rbacLoading && !loading && !error && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allPermissions.map((p) => {
              const isUnlocked = granted.has(p.name);
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-border/50 bg-card/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Badge
                      variant={isUnlocked ? 'default' : 'outline'}
                      className={cn(
                        'gap-1.5',
                        isUnlocked
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {isUnlocked ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      {humanizePermissionName(p.name)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {p.description ?? 'No description set for this permission yet.'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
