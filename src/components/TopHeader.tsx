import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, ChevronDown, HelpCircle, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { InvitationNotifications } from '@/components/InvitationNotifications';
import { ProfileSettings } from '@/components/ProfileSettings';
import { HelpDialog } from '@/components/HelpDialog';
import { Badge } from '@/components/ui/badge';

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
        className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between px-6 gap-4 sticky top-0 z-30"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search Bar */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 h-10 bg-secondary/50 border-border/30 rounded-xl focus:bg-card transition-colors"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHelp(true)}
              className="h-9 w-9 rounded-xl hover:bg-secondary"
            >
              <HelpCircle className="h-4.5 w-4.5 text-muted-foreground" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/active-users')}
              className="h-9 w-9 rounded-xl hover:bg-secondary"
            >
              <Users className="h-4.5 w-4.5 text-muted-foreground" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <InvitationNotifications />
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <ProfileSettings />
          </motion.div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-secondary/80 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden md:block">{displayName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile/edit')}>
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/notifhub')}>
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
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
