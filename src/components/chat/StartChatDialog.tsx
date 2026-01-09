import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversations } from '@/hooks/useConversations';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, Loader2 } from 'lucide-react';

interface StartChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (conversationId: string, userId: string, userName: string, avatar?: string) => void;
}

export const StartChatDialog = ({ open, onOpenChange, onChatCreated }: StartChatDialogProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { createOrGetConversation } = useConversations();
  const { toast } = useToast();

  const handleStartChatByPhone = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Use secure edge function to lookup user by phone (phone number never exposed to client)
      const { data, error } = await supabase.functions.invoke('lookup-user-by-phone', {
        body: { phone_number: phoneNumber.trim() },
      });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to search for user',
          variant: 'destructive',
        });
        return;
      }

      if (!data.found) {
        toast({
          title: 'User not found',
          description: data.error || 'No user found with this phone number',
          variant: 'destructive',
        });
        return;
      }

      const profile = data.profile;
      const conversationId = await createOrGetConversation(profile.id);
      if (conversationId) {
        const userName = profile.display_name || profile.username || profile.email;
        onChatCreated(conversationId, profile.id, userName, profile.avatar_url || undefined);
        onOpenChange(false);
        setPhoneNumber('');
        toast({
          title: 'Chat started',
          description: `Started chat with ${userName}`,
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartChatByEmail = async () => {
    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, email, avatar_url')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error || !profile) {
        toast({
          title: 'User not found',
          description: 'No user found with this email address',
          variant: 'destructive',
        });
        return;
      }

      if (profile.id === user.id) {
        toast({
          title: 'Error',
          description: "You can't start a chat with yourself",
          variant: 'destructive',
        });
        return;
      }

      const conversationId = await createOrGetConversation(profile.id);
      if (conversationId) {
        const userName = profile.display_name || profile.username || profile.email;
        onChatCreated(conversationId, profile.id, userName, profile.avatar_url || undefined);
        onOpenChange(false);
        setEmail('');
        toast({
          title: 'Chat started',
          description: `Started chat with ${userName}`,
        });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
          <DialogDescription>
            Find a user by their phone number or email to start a conversation
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="phone" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="phone" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartChatByPhone()}
              />
              <p className="text-xs text-muted-foreground">
                Enter the full phone number including country code
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartChatByPhone} disabled={loading || !phoneNumber.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Chat
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="email" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartChatByEmail()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartChatByEmail} disabled={loading || !email.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Chat
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
