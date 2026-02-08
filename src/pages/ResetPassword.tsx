import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isSubscribed = true;

    // Check if we have a recovery token in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const tokenType = hashParams.get('type');
    const hasRecoveryToken = accessToken && tokenType === 'recovery';

    const fetchUserProfile = async (userId: string, email: string | null) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setDisplayName(profile.display_name || profile.username || email);
      } else {
        setDisplayName(email || 'User');
      }
    };

    // Check if user has a valid recovery session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (isSubscribed) {
            setSessionError('Unable to verify your session. Please try the reset link again.');
          }
          return;
        }
        
        if (session?.user) {
          if (isSubscribed) {
            setSessionReady(true);
            setUserEmail(session.user.email || null);
            await fetchUserProfile(session.user.id, session.user.email || null);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setSessionError('Something went wrong. Please try the reset link again.');
        }
      }
    };

    // Listen for password recovery event FIRST before checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;
      
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
        setSessionError(null);
        if (session?.user) {
          setUserEmail(session.user.email || null);
          await fetchUserProfile(session.user.id, session.user.email || null);
        }
        // Clear the hash from URL for cleaner UX
        window.history.replaceState(null, '', window.location.pathname);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Only set session ready if we have a recovery token or already ready
        if (hasRecoveryToken || sessionReady) {
          setSessionReady(true);
          setUserEmail(session.user.email || null);
        }
      }
    });

    // Small delay to let the auth listener process the hash first
    setTimeout(() => {
      checkSession();
    }, 100);

    // Set a longer timeout for session loading - give more time for token processing
    timeoutId = setTimeout(() => {
      if (isSubscribed && !sessionReady && !sessionError) {
        // Only show error if there was no recovery token in URL
        if (!hasRecoveryToken) {
          setSessionError('Your reset link may have expired. Please request a new password reset.');
        } else {
          // If there was a token but we still don't have a session, it's likely expired
          setSessionError('Your reset link has expired. Please request a new password reset.');
        }
      }
    }, 3600000); // 1 hour timeout

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [sessionReady]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'Password updated!',
          description: 'Your password has been changed successfully. Redirecting...',
        });
        
        // Auto-login is handled by Supabase, redirect to app
        setTimeout(() => {
          navigate('/app');
        }, 1500);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show error state
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Reset Link Expired
            </CardTitle>
            <CardDescription className="text-base">
              {sessionError}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => navigate('/auth')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while checking session
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Verifying Reset Link
            </CardTitle>
            <CardDescription>
              Please wait while we verify your reset link...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Reset Password
          </CardTitle>
          {displayName && (
            <p className="text-lg font-medium text-primary animate-fade-in">
              Welcome back, {displayName}!
            </p>
          )}
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
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
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <div className="flex items-center gap-2 text-sm text-success animate-fade-in">
                <CheckCircle className="h-4 w-4" />
                <span>Passwords match</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full hover-scale shadow-elegant" 
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'Updating...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;