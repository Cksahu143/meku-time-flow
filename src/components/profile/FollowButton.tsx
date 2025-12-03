import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ 
  targetUserId, 
  currentUserId,
  onFollowChange 
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkFollowStatus();
  }, [targetUserId, currentUserId]);

  const checkFollowStatus = async () => {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle();
    
    setIsFollowing(!!data);
    setLoading(false);
  };

  const handleFollow = async () => {
    setProcessing(true);
    
    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setIsFollowing(false);
        onFollowChange?.(false);
        toast({ title: 'Unfollowed', description: 'You have unfollowed this user.' });
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: currentUserId, following_id: targetUserId });
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setIsFollowing(true);
        onFollowChange?.(true);
        toast({ title: 'Following!', description: 'You are now following this user.' });
        
        // Log activity
        await supabase.from('user_activities').insert({
          user_id: currentUserId,
          activity_type: 'follow',
          target_id: targetUserId,
          target_type: 'user'
        });
      }
    }
    
    setProcessing(false);
  };

  if (loading) {
    return (
      <Button disabled className="min-w-[120px]">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      onClick={handleFollow}
      disabled={processing}
      className={`min-w-[120px] transition-all ${isFollowing ? 'hover:bg-destructive hover:text-destructive-foreground hover:border-destructive' : 'hover-scale'}`}
    >
      {processing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
};
