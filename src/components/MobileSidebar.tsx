import React, { useState } from 'react';
import { Menu, User, Edit, Bell, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Sidebar } from '@/components/Sidebar';
import { ViewType } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect } from 'react';

interface MobileSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ currentView, onViewChange }) => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null>(null);
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

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    setOpen(false);
  };

  const handleSignOut = async () => {
    setOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to sign out' });
    } else {
      navigate('/auth');
    }
  };

  const displayName = profile?.display_name || profile?.username || 'User';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-50">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <Sidebar currentView={currentView} onViewChange={handleViewChange} collapsed={false} />
        </div>

        {/* Quick-access footer */}
        <div className="border-t border-border/40 bg-card/80 p-3 space-y-1.5">
          {/* Profile summary */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <Avatar className="h-8 w-8 ring-2 ring-primary/15">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{displayName}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                @{profile?.username || 'user'}
              </p>
            </div>
          </div>

          <Separator className="bg-border/30" />

          <button
            onClick={() => { setOpen(false); navigate('/profile'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <User className="h-4 w-4" /> My Profile
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/profile/edit'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Edit className="h-4 w-4" /> Edit Profile
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/notifhub'); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Bell className="h-4 w-4" /> Notifications
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
