import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Invitation {
  id: string;
  from_user_id: string;
  to_email: string;
  timetable_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
}

export const useInvitations = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInvitations();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('invitations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'timetable_invitations'
      }, () => {
        loadInvitations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('timetable_invitations')
        .select('*')
        .eq('to_email', user.email)
        .eq('status', 'pending');

      if (error) throw error;

      setInvitations((data as Invitation[]) || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (toEmail: string, timetableId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('timetable_invitations')
        .insert({
          from_user_id: user.id,
          to_email: toEmail,
          timetable_id: timetableId,
        });

      if (error) throw error;

      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${toEmail}`,
      });
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      });
    }
  };

  const acceptInvitation = async (invitationId: string, timetableId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update invitation status
      const { error: updateError } = await supabase
        .from('timetable_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Add to shared timetables
      const { error: shareError } = await supabase
        .from('shared_timetables')
        .insert({
          user_id: user.id,
          timetable_id: timetableId,
          shared_by_user_id: invitations.find(i => i.id === invitationId)?.from_user_id || '',
        });

      if (shareError) throw shareError;

      toast({
        title: 'Invitation accepted',
        description: 'Timetable added to your shared timetables',
      });

      loadInvitations();
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
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
        .from('timetable_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Invitation declined',
      });

      loadInvitations();
    } catch (error: any) {
      console.error('Error declining invitation:', error);
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
    sendInvitation,
    acceptInvitation,
    declineInvitation,
  };
};
