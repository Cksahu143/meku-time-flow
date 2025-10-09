import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2 } from 'lucide-react';
import { useInvitations } from '@/hooks/useInvitations';

interface ShareTimetableDialogProps {
  timetableId: string;
}

export const ShareTimetableDialog: React.FC<ShareTimetableDialogProps> = ({ timetableId }) => {
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const { sendInvitation } = useInvitations();

  const handleShare = async () => {
    if (!email) return;
    
    await sendInvitation(email, timetableId);
    setEmail('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Timetable</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to share your timetable with.
            They'll receive an invitation to view your schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleShare()}
            />
          </div>
          <Button onClick={handleShare} className="w-full">
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
