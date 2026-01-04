import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, Shield, AlertTriangle, Smartphone, Trash2, Monitor, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

export const PrivacySettings: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailVisible, setEmailVisible] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPrivacySettings();
    loadSessions();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || '');

      const { data, error } = await supabase
        .from('profiles')
        .select('email_visible, is_public')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setEmailVisible(data.email_visible ?? true);
        setIsPublic(data.is_public ?? false);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      // Get current session info
      const { data: { session } } = await supabase.auth.getSession();
      
      // Mock sessions data - in production, this would come from a sessions table
      const mockSessions: Session[] = [
        {
          id: session?.access_token?.slice(0, 10) || 'current',
          device: detectDevice(),
          browser: detectBrowser(),
          location: 'Current Location',
          lastActive: new Date(),
          isCurrent: true,
        },
      ];
      
      setSessions(mockSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const detectDevice = () => {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'Mobile';
    if (/tablet/i.test(ua)) return 'Tablet';
    return 'Desktop';
  };

  const detectBrowser = () => {
    const ua = navigator.userAgent;
    if (/chrome/i.test(ua)) return 'Chrome';
    if (/firefox/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua)) return 'Safari';
    if (/edge/i.test(ua)) return 'Edge';
    return 'Unknown Browser';
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          email_visible: emailVisible,
          is_public: isPublic,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Privacy settings updated',
        description: 'Your privacy preferences have been saved',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save privacy settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 6 characters long',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully',
      });
      
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to change password',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast({
        variant: 'destructive',
        title: 'Confirmation required',
        description: 'Please type DELETE to confirm account deletion',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete user profile and related data
      await supabase.from('profiles').delete().eq('id', user.id);
      
      // Sign out
      await supabase.auth.signOut();
      
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted',
      });
      
      window.location.href = '/auth';
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete account',
      });
    } finally {
      setLoading(false);
      setShowDeleteAccount(false);
    }
  };


  const handleLogoutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({
        title: 'Logged out from all devices',
        description: 'You have been signed out from all sessions',
      });
      window.location.href = '/auth';
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to log out from all devices',
      });
    }
  };

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-6 pr-4">
        {/* Profile Visibility Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Profile Visibility</h3>
          </div>
          
          <div className="p-4 rounded-lg border border-border/50">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow anyone to find and view your profile. Required to use group chats.
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            {!isPublic && (
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  With public profile turned off, you cannot use group chats or direct messages.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Password</h3>
          </div>
          
          <div className="p-4 rounded-lg border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Your Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value="••••••••••••"
                    readOnly
                    className="w-40 bg-muted"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your password is securely encrypted and cannot be revealed
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowChangePassword(true)}
              className="hover-scale"
            >
              Change Password
            </Button>
          </div>
        </div>


        {/* Email Visibility Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Email Privacy</h3>
          </div>
          
          <div className="p-4 rounded-lg border border-border/50 space-y-4">
            <div className="space-y-2">
              <Label>Your Email</Label>
              <Input value={userEmail} readOnly className="bg-muted" />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-all">
              <div className="space-y-0.5">
                <Label htmlFor="emailVisible">Show Email to Others</Label>
                <p className="text-sm text-muted-foreground">
                  Allow other users to see your email address on your profile
                </p>
              </div>
              <Switch
                id="emailVisible"
                checked={emailVisible}
                onCheckedChange={setEmailVisible}
              />
            </div>
          </div>
        </div>

        {/* Session Management Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Active Sessions</h3>
          </div>
          
          <div className="p-4 rounded-lg border border-border/50 space-y-4">
            {loadingSessions ? (
              <div className="text-center py-4 text-muted-foreground">Loading sessions...</div>
            ) : (
              <>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {session.device === 'Mobile' ? (
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.browser}</span>
                          {session.isCurrent && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.device} • {session.location}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last active {formatDistanceToNow(session.lastActive, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={handleLogoutAllDevices}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out From All Devices
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
          </div>
          
          <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-destructive">Delete Account</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteAccount(true)}
                className="hover-scale"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSavePrivacy} 
          disabled={loading} 
          className="w-full hover-scale shadow-elegant"
        >
          {loading ? 'Saving...' : 'Save Privacy Settings'}
        </Button>

        {/* Change Password Dialog */}
        <AlertDialog open={showChangePassword} onOpenChange={setShowChangePassword}>
          <AlertDialogContent className="animate-scale-in">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </AlertDialogTitle>
              <AlertDialogDescription>
                Enter your new password below. Make sure it's at least 6 characters long.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Passwords do not match</span>
                </div>
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleChangePassword}
                disabled={loading || !newPassword || newPassword !== confirmPassword}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Account Dialog */}
        <AlertDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
          <AlertDialogContent className="animate-scale-in">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete Account
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>This action is <strong>permanent</strong> and cannot be undone. All your data will be deleted, including:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Your profile information</li>
                  <li>All messages and conversations</li>
                  <li>Group memberships</li>
                  <li>Timetables and tasks</li>
                </ul>
                <p className="pt-2">Type <strong>DELETE</strong> to confirm:</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="border-destructive/50"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={loading || deleteConfirmation !== 'DELETE'}
                className="bg-destructive hover:bg-destructive/90"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </ScrollArea>
  );
};