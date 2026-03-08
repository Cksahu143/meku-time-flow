import React, { useState } from 'react';
import { Search, HelpCircle, Users, User, LogOut, Bell, Settings, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MusicPlayer } from '@/components/MusicPlayer';
import { InvitationNotifications } from '@/components/InvitationNotifications';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { HelpDialog } from '@/components/HelpDialog';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useCallback } from 'react';
import type { FeatureItem } from '@/data/featureRegistry';

interface MobileTopBarProps {
  onSelectFeature?: (feature: FeatureItem) => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onSelectFeature }) => {
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, display_name, username')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data) setProfile(data);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign out' });
    } else {
      navigate('/auth');
    }
  };

  const handleFeatureSelect = useCallback((feature: FeatureItem) => {
    if (feature.route) {
      navigate(feature.route);
    } else if (onSelectFeature) {
      onSelectFeature(feature);
    }
  }, [navigate, onSelectFeature]);

  const displayName = profile?.display_name || profile?.username || 'User';

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card/90 backdrop-blur-xl border-b border-border/30 flex items-center justify-between px-3 gap-2">
        {/* Left: space for hamburger menu (rendered by MobileSidebar at z-50) */}
        <div className="w-10" />

        {/* Center: Search */}
        <button
          onClick={() => setShowSearch(true)}
          className="flex-1 max-w-[200px] flex items-center gap-2 h-9 px-3 bg-secondary/30 border border-border/20 rounded-xl text-xs text-muted-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => setShowHelp(true)} className="h-8 w-8 rounded-lg">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button variant="ghost" size="icon" onClick={() => navigate('/active-users')} className="h-8 w-8 rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
          </Button>

          <MusicPlayer />

          <InvitationNotifications />

          <ProfileSettings />

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative ml-0.5">
                <Avatar className="h-8 w-8 ring-2 ring-primary/15 ring-offset-1 ring-offset-card">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-card" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/30 p-1.5 bg-card/95 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg px-3 py-2.5 text-sm font-medium gap-2">
                <User className="h-4 w-4" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile/edit')} className="rounded-lg px-3 py-2.5 text-sm font-medium gap-2">
                <Edit className="h-4 w-4" /> Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/notifhub')} className="rounded-lg px-3 py-2.5 text-sm font-medium gap-2">
                <Bell className="h-4 w-4" /> Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-border/30" />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive rounded-lg px-3 py-2.5 text-sm font-medium gap-2">
                <LogOut className="h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
      <GlobalSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        onSelectFeature={handleFeatureSelect}
      />
    </>
  );
};
