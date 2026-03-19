import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SaveResultButtonProps {
  toolType: string;
  aiOutput: any;
  subject: string;
  resourceId?: string;
  resourceTitle?: string;
  inputContext?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const SaveResultButton: React.FC<SaveResultButtonProps> = ({
  toolType, aiOutput, subject, resourceId, resourceTitle, inputContext = '',
  variant = 'outline', size = 'sm', className = '',
}) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showOverwrite, setShowOverwrite] = useState(false);

  const doSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await (supabase.from('saved_ai_results' as any) as any).insert({
      user_id: user.id,
      tool_type: toolType,
      input_context: inputContext,
      ai_output: typeof aiOutput === 'string' ? { text: aiOutput } : aiOutput,
      subject,
      resource_id: resourceId || null,
      resource_title: resourceTitle || null,
    });

    if (error) {
      console.error('Save error:', error);
      toast.error('Failed to save');
    } else {
      toast.success('Saved to your collection!');
      setSaved(true);
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!aiOutput) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please sign in'); return; }

    // Check for existing
    if (resourceId) {
      const { data } = await (supabase
        .from('saved_ai_results' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('tool_type', toolType)
        .eq('resource_id', resourceId)
        .limit(1) as any);

      if (data && data.length > 0) {
        setShowOverwrite(true);
        return;
      }
    }

    await doSave();
  };

  const handleOverwrite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete old, save new
    await (supabase
      .from('saved_ai_results' as any)
      .delete()
      .eq('user_id', user.id)
      .eq('tool_type', toolType)
      .eq('resource_id', resourceId) as any);

    setShowOverwrite(false);
    await doSave();
  };

  const handleSaveNew = async () => {
    setShowOverwrite(false);
    await doSave();
  };

  return (
    <>
      <Button
        variant={saved ? 'secondary' : variant}
        size={size}
        onClick={handleSave}
        disabled={saving || saved || !aiOutput}
        className={`gap-1.5 ${className}`}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {saved ? 'Saved ✓' : 'Save'}
      </Button>

      <AlertDialog open={showOverwrite} onOpenChange={setShowOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existing saved result found</AlertDialogTitle>
            <AlertDialogDescription>
              You already have a saved {toolType} result for this resource. Would you like to overwrite it or save as a new entry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveNew} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Save as New
            </AlertDialogAction>
            <AlertDialogAction onClick={handleOverwrite}>
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
