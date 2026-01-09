import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { Users } from 'lucide-react';
import { ForgotPasswordDialog } from '@/components/ForgotPasswordDialog';
import { z } from 'zod';

// Validation schemas for signup and signin
const signUpSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email address')
    .min(5, 'Email too short')
    .max(255, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username: letters, numbers, underscore, hyphen only')
});

const signInSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required')
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
      if (session) {
        navigate('/app');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/app');
      }
    });

    fetchProfiles();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfiles = async () => {
    try {
      // Use profiles_secure view to respect email visibility settings
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
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input using zod schema
      const validationResult = signUpSchema.safeParse({ email, password, username });
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: firstError.message,
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: {
          data: {
            username: validationResult.data.username,
          },
        },
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'Success!',
          description: 'Account created successfully!',
        });
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input using zod schema
      const validationResult = signInSchema.safeParse({ email, password });
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: firstError.message,
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: validationResult.data.email,
        password: validationResult.data.password,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
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

  // Password requirements hint for signup form
  const passwordRequirements = [
    'At least 8 characters',
    'Uppercase letter (A-Z)',
    'Lowercase letter (a-z)',
    'Number (0-9)',
    'Special character (!@#$%^&*)',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl">
        <Card className="w-full md:w-2/3">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
            EducationAssist
          </CardTitle>
          <CardDescription className="text-center">
            School Planner - Sign in or create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground hover:text-primary"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                    {passwordRequirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="text-muted-foreground">•</span> {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="w-full md:w-1/3">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Active Users</CardTitle>
          </div>
          <CardDescription>Users with accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {profiles.map((profile, index) => (
                <div key={profile.id}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(profile.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isUserActive(profile.last_seen) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {profile.username || 'Anonymous'}
                      </p>
                    </div>
                    {isUserActive(profile.last_seen) && (
                      <Badge variant="outline" className="text-xs border-success text-success">
                        Active
                      </Badge>
                    )}
                  </div>
                  {index < profiles.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
              {profiles.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No users yet
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      </div>
      
      <ForgotPasswordDialog 
        open={showForgotPassword} 
        onOpenChange={setShowForgotPassword} 
      />
    </div>
  );
};

export default Auth;
