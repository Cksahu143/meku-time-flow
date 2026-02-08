import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings2, 
  ToggleLeft, 
  School, 
  Clock, 
  Calendar, 
  ListTodo, 
  Timer, 
  MessageSquare, 
  BookOpen, 
  Mic,
  Save,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRBACContext } from '@/contexts/RBACContext';
import { cn } from '@/lib/utils';

interface FeatureConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultEnabled: boolean;
}

const FEATURES: FeatureConfig[] = [
  { key: 'timetable', label: 'Timetable', description: 'Schedule and class management', icon: Clock, defaultEnabled: true },
  { key: 'calendar', label: 'Calendar', description: 'Events and exam tracking', icon: Calendar, defaultEnabled: true },
  { key: 'todo', label: 'To-Do List', description: 'Task management', icon: ListTodo, defaultEnabled: true },
  { key: 'pomodoro', label: 'Pomodoro Timer', description: 'Focus and study sessions', icon: Timer, defaultEnabled: true },
  { key: 'groups', label: 'Study Chat', description: 'Group messaging and collaboration', icon: MessageSquare, defaultEnabled: true },
  { key: 'resources', label: 'Resources', description: 'Study materials and files', icon: BookOpen, defaultEnabled: true },
  { key: 'transcribe', label: 'Transcribe', description: 'Audio transcription (AI-powered)', icon: Mic, defaultEnabled: false },
];

interface SchoolWithFeatures {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  features_enabled: Record<string, boolean>;
}

export function FeatureTogglesView() {
  const [schools, setSchools] = useState<SchoolWithFeatures[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [originalFeatures, setOriginalFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { hasPermission, userRole, schoolId } = useRBACContext();

  const canManage = hasPermission('can_toggle_features') || hasPermission('can_manage_features') || userRole === 'platform_admin';
  const isPlatformAdmin = userRole === 'platform_admin';

  useEffect(() => {
    if (isPlatformAdmin) {
      fetchSchools();
    } else if (schoolId) {
      setSelectedSchoolId(schoolId);
      fetchSchoolFeatures(schoolId);
    }
  }, [isPlatformAdmin, schoolId]);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchSchoolFeatures(selectedSchoolId);
    }
  }, [selectedSchoolId]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, code, is_active, features_enabled')
        .order('name');

      if (error) throw error;
      setSchools((data || []) as SchoolWithFeatures[]);
      
      if (data && data.length > 0) {
        setSelectedSchoolId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching schools:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load schools',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolFeatures = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('features_enabled')
        .eq('id', id)
        .single();

      if (error) throw error;

      const enabledFeatures = (data?.features_enabled || {}) as Record<string, boolean>;
      
      // Merge with defaults
      const merged: Record<string, boolean> = {};
      FEATURES.forEach(f => {
        merged[f.key] = enabledFeatures[f.key] ?? f.defaultEnabled;
      });
      
      setFeatures(merged);
      setOriginalFeatures(merged);
    } catch (error: any) {
      console.error('Error fetching features:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string, enabled: boolean) => {
    setFeatures(prev => ({ ...prev, [key]: enabled }));
  };

  const hasChanges = JSON.stringify(features) !== JSON.stringify(originalFeatures);

  const handleSave = async () => {
    if (!selectedSchoolId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('schools')
        .update({ features_enabled: features })
        .eq('id', selectedSchoolId);

      if (error) throw error;

      setOriginalFeatures(features);
      
      toast({
        title: 'Saved',
        description: 'Feature settings have been updated',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFeatures(originalFeatures);
  };

  const enableAll = () => {
    const all: Record<string, boolean> = {};
    FEATURES.forEach(f => { all[f.key] = true; });
    setFeatures(all);
  };

  const disableAll = () => {
    const all: Record<string, boolean> = {};
    FEATURES.forEach(f => { all[f.key] = false; });
    setFeatures(all);
  };

  if (!canManage) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              You don't have permission to manage feature toggles
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const enabledCount = Object.values(features).filter(Boolean).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings2 className="h-8 w-8 text-primary" />
            </div>
            Feature Toggles
          </h1>
          <p className="text-muted-foreground mt-1">
            Enable or disable features for {isPlatformAdmin ? 'schools' : 'your school'}
          </p>
        </div>

        {isPlatformAdmin && schools.length > 0 && (
          <Select value={selectedSchoolId || ''} onValueChange={setSelectedSchoolId}>
            <SelectTrigger className="w-[250px]">
              <School className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select a school" />
            </SelectTrigger>
            <SelectContent>
              {schools.map(school => (
                <SelectItem key={school.id} value={school.id}>
                  <div className="flex items-center gap-2">
                    <span>{school.name}</span>
                    {!school.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </motion.div>

      {/* Selected School Info */}
      {selectedSchool && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border/50 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedSchool.name}</p>
                    <p className="text-sm text-muted-foreground">Code: {selectedSchool.code}</p>
                  </div>
                </div>
                <Badge variant={selectedSchool.is_active ? 'default' : 'secondary'}>
                  {selectedSchool.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Features List */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Features
              </CardTitle>
              <CardDescription>
                {enabledCount} of {FEATURES.length} features enabled
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={enableAll}>
                <Check className="h-4 w-4 mr-1" />
                Enable All
              </Button>
              <Button variant="outline" size="sm" onClick={disableAll}>
                <X className="h-4 w-4 mr-1" />
                Disable All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48 mt-1" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const isEnabled = features[feature.key] ?? feature.defaultEnabled;

                return (
                  <motion.div
                    key={feature.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-colors',
                      isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'p-2.5 rounded-lg transition-colors',
                        isEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-base font-medium">{feature.label}</Label>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6"
        >
          <Card className="border-primary/50 bg-card shadow-lg">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  You have unsaved changes
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleReset} disabled={saving}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
