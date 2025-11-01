import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GroupInvitation } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationsPanelProps {
  onClose: () => void;
}

export const InvitationsPanel = ({ onClose }: InvitationsPanelProps) => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();

    const channel = supabase
      .channel('invitation_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_invitations'
        },
        () => {
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInvitations = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          *,
          groups (name, avatar_url),
          profiles!group_invitations_invited_by_fkey (username, display_name, avatar_url)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(data || []);
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

  const handleInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      if (accept) {
        const invitation = invitations.find(inv => inv.id === invitationId);
        if (invitation) {
          const { error: memberError } = await supabase
            .from('group_members')
            .insert([{
              group_id: invitation.group_id,
              user_id: user.id,
              role: 'member'
            }]);

          if (memberError) throw memberError;
        }
      }

      toast({
        title: 'Success',
        description: accept ? 'Invitation accepted!' : 'Invitation rejected.',
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold">Pending Invitations</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : invitations.length === 0 ? (
            <p className="text-center text-muted-foreground">No pending invitations</p>
          ) : (
            invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="p-4 rounded-lg border border-border bg-card space-y-3 animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={invitation.groups?.avatar_url} />
                    <AvatarFallback>
                      {invitation.groups?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{invitation.groups?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invitation.profiles?.display_name || invitation.profiles?.username}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleInvitation(invitation.id, true)}
                    className="flex-1"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInvitation(invitation.id, false)}
                    className="flex-1"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
