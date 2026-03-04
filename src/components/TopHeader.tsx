import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, ChevronDown, HelpCircle, Users, Command } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { InvitationNotifications } from '@/components/InvitationNotifications';
import { ProfileSettings } from '@/components/ProfileSettings';
import { HelpDialog } from '@/components/HelpDialog';

export const TopHeader: React.FC = () => {
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name, username')
        .eq('id', session.user.id)
        .single();
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

  const displayName = profile?.display_name || profile?.username || 'User';

  return (
    <>
      <motion.header
        className="h-16 border-b border-border/40 bg-card/60 backdrop-blur-xl flex items-center justify-between px-6 gap-4 sticky top-0 z-30"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search anything..."
              className="pl-10 pr-20 h-10 bg-secondary/40 border-border/30 rounded-xl focus:bg-card focus:shadow-md focus:border-primary/30 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 text-muted-foreground/50">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border/50">⌘</kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border/50">K</kbd>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {[
            { icon: HelpCircle, onClick: () => setShowHelp(true), label: 'Help' },
            { icon: Users, onClick: () => navigate('/active-users'), label: 'Users' },
          ].map(({ icon: Icon, onClick, label }) => (
            <Tooltip key={label}>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                <Button variant="ghost" size="icon" onClick={onClick} className="h-9 w-9 rounded-xl hover:bg-secondary">
                  <Icon className="h-[18px] w-[18px] text-muted-foreground" />
                </Button>
              </motion.div>
            </Tooltip>
          ))}

          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <InvitationNotifications />
          </motion.div>

          <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
            <ProfileSettings />
          </motion.div>

          <div className="w-px h-6 bg-border/50 mx-1.5" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-secondary/80 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Avatar className="h-8 w-8 ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <span className="text-sm font-semibold text-foreground block leading-tight">{displayName}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/40">
              <DropdownMenuItem onClick={() => navigate('/profile')} className="rounded-lg">
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile/edit')} className="rounded-lg">
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/notifhub')} className="rounded-lg">
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive rounded-lg">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
};

// Simple inline tooltip for header buttons
const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
