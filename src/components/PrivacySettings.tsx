import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, Mail, Shield, AlertTriangle } from 'lucide-react';
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

export const PrivacySettings: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [emailVisible, setEmailVisible] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrivacySettings();
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

  return (
    <div className="space-y-6">
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
                Allow anyone to find and view your profile
              </p>
            </div>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
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
    </div>
  );
};