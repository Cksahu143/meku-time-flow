import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, UserCheck, User, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';
import { OnlineStatus } from '@/components/chat/OnlineStatus';

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  last_seen: string | null;
  display_name: string | null;
}

const ActiveUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { createOrGetConversation } = useConversations();
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
    fetchProfiles();

    // Set up realtime subscription for profile updates
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          fetchProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchFollowing();
    }
  }, [currentUserId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchProfiles = async () => {
    try {
      // Use profiles_secure view to respect email visibility settings and privacy
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('id, username, avatar_url, last_seen, display_name')
        .eq('is_public', true)
        .order('last_seen', { ascending: false });

      if (error) throw error;
      if (data) setProfiles(data as Profile[]);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!currentUserId) return;

    try {
      const { data: follows, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (error) throw error;

      if (follows && follows.length > 0) {
        const followingIds = follows.map(f => f.following_id);
        // Use profiles_secure view to respect privacy settings
        const { data: followingData, error: profilesError } = await supabase
          .from('profiles_secure')
          .select('id, username, avatar_url, last_seen, display_name')
          .in('id', followingIds)
          .order('last_seen', { ascending: false });

        if (profilesError) throw profilesError;
        if (followingData) setFollowingProfiles(followingData as Profile[]);
      } else {
        setFollowingProfiles([]);
      }
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const isUserActive = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleCreateChat = async (userId: string) => {
    const conversationId = await createOrGetConversation(userId);
    if (conversationId) {
      navigate('/app', { state: { openConversation: conversationId, userId } });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to open chat',
        variant: 'destructive',
      });
    }
  };

  const renderUserItem = (profile: Profile, index: number, total: number) => (
    <div key={profile.id}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div 
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineStatus 
                  isOnline={isUserActive(profile.last_seen)} 
                  size="md"
                  showText={false}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">
                {profile.display_name || profile.username || 'Anonymous'}
              </p>
              <OnlineStatus 
                isOnline={isUserActive(profile.last_seen)} 
                lastSeen={profile.last_seen}
                showBadge={false}
                showText={true}
              />
            </div>
            {isUserActive(profile.last_seen) && (
              <Badge className="bg-success text-success-foreground border-success animate-pulse">
                Active
              </Badge>
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 animate-scale-in">
          <DropdownMenuItem onClick={() => handleViewProfile(profile.id)} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          {profile.id !== currentUserId && (
            <DropdownMenuItem onClick={() => handleCreateChat(profile.id)} className="cursor-pointer">
              <MessageSquare className="mr-2 h-4 w-4" />
              Create Chat
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {index < total - 1 && <Separator className="mt-4" />}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="hover-scale"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Users
            </h1>
            <p className="text-muted-foreground">
              Connect with other EducationAssist users
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Active Users
                </TabsTrigger>
                <TabsTrigger value="following" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Following
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                <CardDescription className="mb-4">
                  {profiles.filter(p => isUserActive(p.last_seen)).length} active now · {profiles.length} total users
                </CardDescription>
                <ScrollArea className="h-[600px] pr-4">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : profiles.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No users yet</p>
                  ) : (
                    <div className="space-y-4">
                      {profiles.map((profile, index) => renderUserItem(profile, index, profiles.length))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="following" className="mt-4">
                <CardDescription className="mb-4">
                  {followingProfiles.filter(p => isUserActive(p.last_seen)).length} active now · {followingProfiles.length} following
                </CardDescription>
                <ScrollArea className="h-[600px] pr-4">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : followingProfiles.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">You're not following anyone yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Visit user profiles to follow them
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {followingProfiles.map((profile, index) => renderUserItem(profile, index, followingProfiles.length))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default ActiveUsers;
