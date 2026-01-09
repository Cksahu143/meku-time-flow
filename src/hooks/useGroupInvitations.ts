import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by: string;
  status: string;
  created_at: string;
  groups?: {
    name: string;
    avatar_url: string | null;
  };
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useGroupInvitations = () => {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();

    const channel = supabase
      .channel('group_invitation_changes')
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

      // First get the invitations with group info
      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          *,
          groups (name, avatar_url)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch inviter profiles separately
      if (data && data.length > 0) {
        const inviterIds = [...new Set(data.map(inv => inv.invited_by))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', inviterIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const invitationsWithProfiles = data.map(inv => ({
          ...inv,
          profiles: profileMap.get(inv.invited_by) || null
        }));
        
        setInvitations(invitationsWithProfiles as GroupInvitation[]);
      } else {
        setInvitations([]);
      }
    } catch (error: any) {
      console.error('Error fetching group invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

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

      toast({
        title: 'Success',
        description: 'You have joined the group!',
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept invitation',
        variant: 'destructive',
      });
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation declined',
      });

      fetchInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to decline invitation',
        variant: 'destructive',
      });
    }
  };

  return {
    invitations,
    loading,
    acceptInvitation,
    declineInvitation,
    refetch: fetchInvitations,
  };
};
