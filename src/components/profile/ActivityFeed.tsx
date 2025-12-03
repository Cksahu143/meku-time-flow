import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, UserPlus, FileText, MessageCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  target_id: string | null;
  target_type: string | null;
  metadata: any;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  target_profile?: {
    username: string | null;
    display_name: string | null;
  };
}

interface ActivityFeedProps {
  userId: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ userId }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [userId]);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) {
      // Fetch profiles for activities
      const activitiesWithProfiles = await Promise.all(data.map(async (activity) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', activity.user_id)
          .maybeSingle();
        
        let target_profile = null;
        if (activity.target_type === 'user' && activity.target_id) {
          const { data: targetData } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('id', activity.target_id)
            .maybeSingle();
          target_profile = targetData;
        }
        
        return { ...activity, profile, target_profile };
      }));
      setActivities(activitiesWithProfiles);
    }
    setLoading(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'post':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    const name = activity.profile?.display_name || activity.profile?.username || 'Someone';
    
    switch (activity.activity_type) {
      case 'like':
        return <><strong>{name}</strong> liked a post</>;
      case 'follow':
        const targetName = activity.target_profile?.display_name || activity.target_profile?.username || 'someone';
        return <><strong>{name}</strong> followed <strong>{targetName}</strong></>;
      case 'post':
        return <><strong>{name}</strong> created a new post</>;
      case 'comment':
        return <><strong>{name}</strong> commented on a post</>;
      default:
        return <><strong>{name}</strong> did something</>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="p-8 text-center text-muted-foreground">
          No recent activity.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {activities.map((activity, index) => (
        <Card 
          key={activity.id} 
          className="animate-slide-in-left overflow-hidden hover:shadow-sm transition-shadow"
          style={{ animationDelay: `${index * 0.03}s` }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-muted animate-pulse-glow">
                {getActivityIcon(activity.activity_type)}
              </div>
              
              <Avatar className="h-8 w-8">
                <AvatarImage src={activity.profile?.avatar_url || ''} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {(activity.profile?.display_name || activity.profile?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm">{getActivityText(activity)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
