import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Users, BookOpenCheck, ArrowRight, Sparkles } from 'lucide-react';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().trim().email('Invalid email address').min(5).max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, underscore, hyphen only')
});

const signInSchema = z.object({
  email: z.string().trim().email('Invalid email address').min(1),
  password: z.string().min(1, 'Password is required')
});

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  last_seen: string | null;
}

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/app');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate('/app');
    });
    fetchProfiles();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles_secure')
        .select('id, username, avatar_url, last_seen')
        .eq('is_public', true)
        .order('last_seen', { ascending: false })
        .limit(10);
      if (error) throw error;
      if (data) setProfiles(data);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const isUserActive = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return new Date(lastSeen) > new Date(Date.now() - 5 * 60 * 1000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = signUpSchema.safeParse({ email, password, username });
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Validation Error', description: result.error.errors[0].message });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: { data: { username: result.data.username } },
      });
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
      else toast({ title: 'Success!', description: 'Account created successfully!' });
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred' }); }
    finally { setLoading(false); }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = signInSchema.safeParse({ email, password });
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Validation Error', description: result.error.errors[0].message });
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: result.data.email, password: result.data.password });
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred' }); }
    finally { setLoading(false); }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (error) toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to sign in with Google' });
    } catch { toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred' }); }
    finally { setLoading(false); }
  };

  const passwordRequirements = [
    'At least 8 characters', 'Uppercase letter (A-Z)', 'Lowercase letter (a-z)',
    'Number (0-9)', 'Special character (!@#$%^&*)',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-mesh p-4 relative overflow-hidden">
      {/* Animated morphing orbs */}
      <motion.div
        className="absolute top-20 left-[10%] w-80 h-80 rounded-full blur-3xl opacity-20 animate-morph"
        style={{ background: 'hsl(var(--primary) / 0.15)' }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 right-[10%] w-64 h-64 rounded-full blur-3xl opacity-15 animate-morph"
        style={{ background: 'hsl(var(--accent) / 0.2)', animationDelay: '-4s' }}
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] opacity-10"
        style={{ background: 'hsl(var(--success) / 0.15)' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div 
        className="flex flex-col md:flex-row gap-6 w-full max-w-5xl relative z-10"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 150, damping: 20 }}
      >
        <Card className="w-full md:w-2/3 shadow-lg border-border/30 card-premium">
          <CardHeader className="space-y-3 pb-4">
            <motion.div 
              className="flex items-center justify-center gap-3"
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                className="p-2.5 rounded-xl bg-gradient-primary shadow-primary relative overflow-hidden"
                whileHover={{ scale: 1.1, rotate: 5 }}
                animate={{ rotate: [0, 2, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <BookOpenCheck className="w-6 h-6 text-primary-foreground relative z-10" />
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, transparent 40%, hsl(0 0% 100% / 0.2) 50%, transparent 60%)' }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                />
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <CardTitle className="font-display text-3xl font-bold text-center text-gradient-blue">
                Education Assist
              </CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <CardDescription className="text-center text-muted-foreground">
                Sign in to your EDAS account
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl">
                <TabsTrigger value="signin" className="rounded-lg font-semibold">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg font-semibold">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="font-medium">Email</Label>
                    <Input id="signin-email" type="email" placeholder="your@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} required className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="font-medium">Password</Label>
                    <Input id="signin-password" type="password" placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)} required className="rounded-xl h-11" />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl btn-glow font-semibold gap-2" disabled={loading}>
                    {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
                  </Button>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="divider-gradient w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground font-medium">Or</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full h-11 rounded-xl gap-2 font-medium"
                    onClick={handleGoogleSignIn} disabled={loading}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>

                  <Button type="button" variant="link" className="w-full text-muted-foreground hover:text-primary text-sm"
                    onClick={() => setShowForgotPassword(true)}>
                    Forgot Password?
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="font-medium">Username</Label>
                    <Input id="signup-username" type="text" placeholder="Your username" value={username}
                      onChange={(e) => setUsername(e.target.value)} required className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="font-medium">Email</Label>
                    <Input id="signup-email" type="email" placeholder="your@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)} required className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="font-medium">Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)} required className="rounded-xl h-11" />
                    <ul className="text-xs text-muted-foreground space-y-0.5 mt-1.5 pl-1">
                      {passwordRequirements.map((req, index) => (
                        <li key={index} className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground/50" /> {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-xl btn-glow font-semibold gap-2" disabled={loading}>
                    {loading ? 'Creating account...' : <><Sparkles className="w-4 h-4" /><span>Create Account</span></>}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="w-full md:w-1/3 shadow-lg border-border/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="font-display text-lg font-bold">Community</CardTitle>
            </div>
            <CardDescription>Active members</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {profiles.map((profile, index) => (
                  <motion.div 
                    key={profile.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold text-xs">
                            {(profile.username || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isUserActive(profile.last_seen) && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success border-2 border-card rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{profile.username || 'Anonymous'}</p>
                      </div>
                      {isUserActive(profile.last_seen) && (
                        <Badge variant="outline" className="text-[10px] border-success/30 text-success px-1.5 py-0">
                          Online
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
                {profiles.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">No users yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
      
      <ForgotPasswordDialog open={showForgotPassword} onOpenChange={setShowForgotPassword} />
    </div>
  );
};

export default Auth;
