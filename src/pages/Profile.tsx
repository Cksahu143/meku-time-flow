import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings, UserPlus, UserMinus, MapPin, Calendar, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PostsFeed } from '@/components/profile/PostsFeed';
import { MediaGallery } from '@/components/profile/MediaGallery';
import { ActivityFeed } from '@/components/profile/ActivityFeed';
import { FollowButton } from '@/components/profile/FollowButton';

interface ProfileData {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_header_url: string | null;
  created_at: string;
}

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      const targetUserId = userId || user?.id;
      if (targetUserId) {
        await fetchProfile(targetUserId);
        await fetchStats(targetUserId);
      }
      setLoading(false);
    };
    init();
  }, [userId]);

  const fetchProfile = async (id: string) => {
    // Explicitly select only public profile fields - exclude phone_number for privacy
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, profile_header_url, created_at')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (data) {
      setProfile(data);
    }
  };

  const fetchStats = async (id: string) => {
    const [followers, following, posts] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', id),
      supabase.from('posts').select('id', { count: 'exact' }).eq('user_id', id),
    ]);
    
    setFollowersCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setPostsCount(posts.count || 0);
  };

  const isOwnProfile = currentUserId === (userId || currentUserId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-muted rounded-full" />
          <div className="w-32 h-4 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 animate-fade-in">
          <p className="text-muted-foreground">User not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="relative">
        <div 
          className="h-48 md:h-64 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 animate-gradient"
          style={profile.profile_header_url ? { 
            backgroundImage: `url(${profile.profile_header_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        />
        
        <div className="absolute top-4 left-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="bg-background/50 backdrop-blur-sm hover:bg-background/70 animate-scale-in"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {isOwnProfile && (
          <div className="absolute top-4 right-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/profile/edit')}
              className="bg-background/50 backdrop-blur-sm hover:bg-background/70 animate-scale-in"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Avatar */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0">
          <Avatar className="h-32 w-32 border-4 border-background shadow-xl animate-bounce-in">
            <AvatarImage src={profile.avatar_url || ''} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Profile Info */}
      <div className="pt-20 md:pt-8 md:ml-44 px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="text-center md:text-left animate-slide-up">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username || 'Anonymous'}</h1>
            {profile.username && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="mt-2 text-foreground/80 max-w-md">{profile.bio}</p>
            )}
            <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {!isOwnProfile && currentUserId && (
            <div className="flex justify-center md:justify-start animate-scale-in">
              <FollowButton targetUserId={profile.id} currentUserId={currentUserId} />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-center md:justify-start gap-6 mt-6 animate-fade-in">
          <button className="text-center hover:bg-muted/50 px-3 py-2 rounded-lg transition-colors">
            <span className="font-bold block">{postsCount}</span>
            <span className="text-sm text-muted-foreground">Posts</span>
          </button>
          <button className="text-center hover:bg-muted/50 px-3 py-2 rounded-lg transition-colors">
            <span className="font-bold block">{followersCount}</span>
            <span className="text-sm text-muted-foreground">Followers</span>
          </button>
          <button className="text-center hover:bg-muted/50 px-3 py-2 rounded-lg transition-colors">
            <span className="font-bold block">{followingCount}</span>
            <span className="text-sm text-muted-foreground">Following</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 px-4 md:px-8 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 animate-slide-up">
            <TabsTrigger value="posts" className="data-[state=active]:animate-scale-in">Posts</TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:animate-scale-in">Media</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:animate-scale-in">Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="mt-6 animate-fade-in">
            <PostsFeed userId={profile.id} currentUserId={currentUserId} />
          </TabsContent>
          
          <TabsContent value="media" className="mt-6 animate-fade-in">
            <MediaGallery userId={profile.id} />
          </TabsContent>
          
          <TabsContent value="activity" className="mt-6 animate-fade-in">
            <ActivityFeed userId={profile.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
