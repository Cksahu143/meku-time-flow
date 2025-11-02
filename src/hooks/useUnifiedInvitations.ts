import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimetableInvitation {
  id: string;
  from_user_id: string;
  to_email: string;
  timetable_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  type: 'timetable';
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  type: 'group';
  group?: {
    name: string;
    avatar_url?: string;
  };
  inviter?: {
    display_name?: string;
    username?: string;
  };
}

export type UnifiedInvitation = TimetableInvitation | GroupInvitation;

export const useUnifiedInvitations = () => {
  const [timetableInvitations, setTimetableInvitations] = useState<TimetableInvitation[]>([]);
  const [groupInvitations, setGroupInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInvitations();
    
    // Subscribe to both invitation types
    const channel = supabase
      .channel('unified-invitations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'timetable_invitations'
      }, () => {
        loadTimetableInvitations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_invitations'
      }, () => {
        loadGroupInvitations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInvitations = async () => {
    await Promise.all([loadTimetableInvitations(), loadGroupInvitations()]);
    setLoading(false);
  };

  const loadTimetableInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('timetable_invitations')
        .select('*')
        .eq('to_email', user.email)
        .eq('status', 'pending');

      if (error) throw error;

      setTimetableInvitations((data || []).map(inv => ({ 
        ...inv, 
        type: 'timetable' as const,
        status: inv.status as 'pending' | 'accepted' | 'declined'
      })));
    } catch (error) {
      console.error('Error loading timetable invitations:', error);
    }
  };

  const loadGroupInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('group_invitations')
        .select(`
          *,
          group:groups(name, avatar_url),
          inviter:profiles!group_invitations_invited_by_fkey(display_name, username)
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      setGroupInvitations((data || []).map(inv => ({ 
        ...inv, 
        type: 'group' as const,
        status: inv.status as 'pending' | 'accepted' | 'rejected',
        group: Array.isArray(inv.group) ? inv.group[0] : inv.group,
        inviter: Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter
      })));
    } catch (error) {
      console.error('Error loading group invitations:', error);
    }
  };

  const acceptTimetableInvitation = async (invitationId: string, timetableId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('timetable_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      const { error: shareError } = await supabase
        .from('shared_timetables')
        .insert({
          user_id: user.id,
          timetable_id: timetableId,
          shared_by_user_id: timetableInvitations.find(i => i.id === invitationId)?.from_user_id || '',
        });

      if (shareError) throw shareError;

      toast({
        title: 'Invitation accepted',
        description: 'Timetable added to your shared timetables',
      });

      loadTimetableInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const declineTimetableInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('timetable_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({ title: 'Invitation declined' });
      loadTimetableInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const acceptGroupInvitation = async (invitationId: string, groupId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      toast({
        title: 'Invitation accepted',
        description: 'You have joined the group!',
      });

      loadGroupInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const declineGroupInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('group_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;

      toast({ title: 'Invitation declined' });
      loadGroupInvitations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const totalCount = timetableInvitations.length + groupInvitations.length;

  return {
    timetableInvitations,
    groupInvitations,
    totalCount,
    loading,
    acceptTimetableInvitation,
    declineTimetableInvitation,
    acceptGroupInvitation,
    declineGroupInvitation,
  };
};
