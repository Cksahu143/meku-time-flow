import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (name: string, description?: string) => Promise<any>;
}

export const CreateGroupDialog = ({ open, onOpenChange, onCreateGroup }: CreateGroupDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (inviteEmails.includes(email)) {
      toast({
        title: 'Email already added',
        variant: 'destructive',
      });
      return;
    }

    setInviteEmails([...inviteEmails, email]);
    setEmailInput('');
  };

  const handleRemoveEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const group = await onCreateGroup(name.trim(), description.trim() || undefined);
      
      // Send invitations if emails were provided
      if (inviteEmails.length > 0 && group?.id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Find user IDs for the emails
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('email', inviteEmails);

        if (profiles && profiles.length > 0) {
          // Check for existing invitations
          const { data: existingInvitations } = await supabase
            .from('group_invitations')
            .select('invited_user_id')
            .eq('group_id', group.id)
            .in('invited_user_id', profiles.map(p => p.id));

          const existingUserIds = new Set(existingInvitations?.map(inv => inv.invited_user_id) || []);
          const newProfiles = profiles.filter(p => !existingUserIds.has(p.id));

          if (newProfiles.length > 0) {
            const invitations = newProfiles.map(profile => ({
              group_id: group.id,
              invited_by: user.id,
              invited_user_id: profile.id,
            }));

            await supabase.from('group_invitations').insert(invitations);
          }
          
          toast({
            title: 'Group created',
            description: newProfiles.length > 0 
              ? `Invited ${newProfiles.length} user(s) to the group`
              : 'Group created successfully',
          });
        }
      }

      setName('');
      setDescription('');
      setInviteEmails([]);
      setEmailInput('');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Create a new group and invite members by email (optional).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Invite Members by Email (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="user@example.com"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleAddEmail}>
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
              {inviteEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {inviteEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
