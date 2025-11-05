import React, { useState, useRef } from 'react';
import { Group } from '@/types';
import { useGroupMembers } from '@/hooks/useGroupMembers';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Upload, UserMinus, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  isAdmin: boolean;
  onUpdateGroup: (groupId: string, name: string) => void;
}

export const GroupInfoDialog = ({
  open,
  onOpenChange,
  group,
  isAdmin,
  onUpdateGroup,
}: GroupInfoDialogProps) => {
  const { members, loading, removeMember } = useGroupMembers(group.id);
  const [groupName, setGroupName] = useState(group.name);
  const [uploading, setUploading] = useState(false);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    fetchHostProfile();
  }, [group.created_by]);

  React.useEffect(() => {
    setGroupName(group.name);
  }, [group.name]);

  const fetchHostProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url')
      .eq('id', group.created_by)
      .single();
    
    if (data) setHostProfile(data);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${group.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('groups')
        .update({ avatar_url: publicUrl })
        .eq('id', group.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Group avatar updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (groupName.trim() === group.name) return;
    onUpdateGroup(group.id, groupName.trim());
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Remove ${memberName} from the group?`)) {
      await removeMember(memberId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group Information</DialogTitle>
          <DialogDescription>View and manage group details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Avatar & Name */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={group.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {group.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {isAdmin ? (
              <div className="w-full space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    onBlur={handleNameUpdate}
                  />
                </div>
              </div>
            ) : (
              <h3 className="text-xl font-semibold">{group.name}</h3>
            )}
          </div>

          {/* Host Info */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Group Host
            </Label>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
              <Avatar className="h-10 w-10">
                <AvatarImage src={hostProfile?.avatar_url} />
                <AvatarFallback>
                  {hostProfile?.username?.[0]?.toUpperCase() || 'H'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {hostProfile?.display_name || hostProfile?.username || 'Host'}
              </span>
            </div>
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <Label>Members ({members.length})</Label>
            <ScrollArea className="h-64 rounded-lg border">
              {loading ? (
                <div className="p-3 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {member.display_name}
                          </span>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="w-fit text-xs">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isAdmin && member.user_id !== group.created_by && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveMember(member.id, member.display_name)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
