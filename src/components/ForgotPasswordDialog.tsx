import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  // Use an env var so the redirect domain can be changed without editing code
  const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://edas.vercel.app';

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${FRONTEND_URL}/reset-password`,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Email sent!',
          description: 'Check your inbox for the password reset link',
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

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md animate-scale-in">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {emailSent ? (
              <CheckCircle className="h-6 w-6 text-success" />
            ) : (
              <Mail className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">
            {emailSent ? 'Check your email' : 'Forgot Password?'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {emailSent
              ? `We've sent a password reset link to ${email}`
              : "Enter your email address and we'll send you a link to reset your password"}
          </DialogDescription>
        </DialogHeader>

        {!emailSent ? (
          <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all focus:scale-[1.01]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || !email}
                className="flex-1 hover-scale"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
              <p className="text-sm text-success">
                Click the link in the email to reset your password. 
                The link will expire in 1 hour.
              </p>
            </div>
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
