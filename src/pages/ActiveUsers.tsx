import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Users } from 'lucide-react';

interface Profile {
  id: string;
  username: string | null;
  email: string;
  avatar_url: string | null;
  last_seen: string | null;
  display_name: string | null;
}

const ActiveUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
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

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url, last_seen, display_name')
        .order('last_seen', { ascending: false });

      if (error) throw error;
      if (data) setProfiles(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUserActive = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Active Users
            </h1>
            <p className="text-muted-foreground">
              See who's currently using EducationAssist
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>All Users</CardTitle>
            </div>
            <CardDescription>
              {profiles.filter(p => isUserActive(p.last_seen)).length} active now · {profiles.length} total users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : profiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users yet</p>
              ) : (
                <div className="space-y-4">
                  {profiles.map((profile, index) => (
                    <div key={profile.id}>
                      <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                              {(profile.display_name || profile.username || profile.email || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isUserActive(profile.last_seen) && (
                            <span className="absolute bottom-0 right-0 w-4 h-4 bg-success border-2 border-background rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg truncate">
                            {profile.display_name || profile.username || 'Anonymous'}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {profile.email}
                          </p>
                          {profile.last_seen && (
                            <p className="text-xs text-muted-foreground">
                              Last seen: {new Date(profile.last_seen).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {isUserActive(profile.last_seen) && (
                          <Badge className="bg-success text-success-foreground border-success">
                            Active
                          </Badge>
                        )}
                      </div>
                      {index < profiles.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActiveUsers;
