import React, { useState, useEffect, useCallback } from 'react';
import { MusicPlayer } from '@/components/MusicPlayer';
import { motion } from 'framer-motion';
import { Search, Bell, ChevronDown, HelpCircle, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { InvitationNotifications } from '@/components/InvitationNotifications';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { HelpDialog } from '@/components/HelpDialog';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';
import type { FeatureItem } from '@/data/featureRegistry';

interface TopHeaderProps {
  onSelectFeature?: (feature: FeatureItem) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onSelectFeature }) => {
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
    loadProfile();
  }, []);

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
      <motion.header
        className="h-16 border-b border-border/30 bg-card/50 backdrop-blur-2xl flex items-center justify-between px-6 gap-4 sticky top-0 z-30"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

        {/* Search trigger */}
        <div className="flex-1 max-w-md">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full relative group flex items-center"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="w-full pl-10 pr-20 h-10 bg-secondary/30 border border-border/20 rounded-xl flex items-center text-sm text-muted-foreground/50 hover:bg-card hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer">
              Search features...
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-muted-foreground/40">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted/50 rounded border border-border/30">⌘</kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted/50 rounded border border-border/30">K</kbd>
            </div>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {[
            { icon: HelpCircle, onClick: () => setShowHelp(true), label: 'Help' },
            { icon: Users, onClick: () => navigate('/active-users'), label: 'Users' },
          ].map(({ icon: Icon, onClick, label }) => (
            <SimpleTooltip key={label}>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <Button variant="ghost" size="icon" onClick={onClick} className="h-9 w-9 rounded-xl hover:bg-secondary/60 hover:shadow-sm">
                  <Icon className="h-[18px] w-[18px] text-muted-foreground" />
                </Button>
              </motion.div>
            </SimpleTooltip>
          ))}

          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <InvitationNotifications />
          </motion.div>

          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <ProfileSettings />
          </motion.div>

          <div className="w-px h-6 bg-gradient-to-b from-transparent via-border/50 to-transparent mx-1.5" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-secondary/50 transition-all group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/15 ring-offset-2 ring-offset-card">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
                </div>
                <div className="hidden md:block text-left">
                  <span className="text-sm font-semibold text-foreground block leading-tight">{displayName}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block group-hover:text-foreground transition-colors" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border-border/30 p-1.5 bg-card/95 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg px-3 py-2.5 text-sm font-medium">
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile/edit')} className="rounded-lg px-3 py-2.5 text-sm font-medium">
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/notifhub')} className="rounded-lg px-3 py-2.5 text-sm font-medium">
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-border/30" />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive rounded-lg px-3 py-2.5 text-sm font-medium">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
      <GlobalSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        onSelectFeature={handleFeatureSelect}
      />
    </>
  );
};

/** Simple inline tooltip wrapper for header buttons */
const SimpleTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
