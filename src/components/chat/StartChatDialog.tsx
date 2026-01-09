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
import { Mail, Loader2 } from 'lucide-react';

interface StartChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (conversationId: string, userId: string, userName: string, avatar?: string) => void;
}

export const StartChatDialog = ({ open, onOpenChange, onChatCreated }: StartChatDialogProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { createOrGetConversation } = useConversations();
  const { toast } = useToast();

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
            Find a user by their email address to start a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartChatByEmail()}
            />
          </div>
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
      </DialogContent>
    </Dialog>
  );
};
