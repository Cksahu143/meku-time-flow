import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  Plus, 
  Pin, 
  Clock, 
  AlertTriangle, 
  Users, 
  Edit, 
  Trash2,
  Send,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRBACContext } from '@/contexts/RBACContext';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  school_id: string | null;
  created_by: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'students' | 'teachers' | 'staff';
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground', icon: null },
  normal: { label: 'Normal', color: 'bg-blue-500/10 text-blue-600', icon: null },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-600', icon: AlertTriangle },
  urgent: { label: 'Urgent', color: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

const audienceConfig = {
  all: { label: 'Everyone', icon: Users },
  students: { label: 'Students Only', icon: Users },
  teachers: { label: 'Teachers Only', icon: Users },
  staff: { label: 'Staff Only', icon: Users },
};

export function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState<'all' | 'pinned' | 'urgent'>('all');
  const { toast } = useToast();
  const { hasPermission, userRole, schoolId } = useRBACContext();

  const canPost = hasPermission('can_post_announcements') || userRole === 'platform_admin' || userRole === 'school_admin' || userRole === 'teacher';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements((data || []) as Announcement[]);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load announcements',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'pinned') return a.is_pinned;
    if (filter === 'urgent') return a.priority === 'urgent' || a.priority === 'high';
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Megaphone className="h-8 w-8 text-primary" />
            </div>
            Announcements
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with important announcements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pinned">Pinned</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {canPost && (
            <CreateAnnouncementDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              onSuccess={fetchAnnouncements}
              schoolId={schoolId}
            />
          )}
        </div>
      </motion.div>

      {/* Announcements List */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {filter === 'all' ? 'No announcements yet' : `No ${filter} announcements`}
              </p>
              {canPost && filter === 'all' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Announcement
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredAnnouncements.map((announcement, index) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                index={index}
                canEdit={canPost}
                onEdit={() => setEditingAnnouncement(announcement)}
                onDelete={fetchAnnouncements}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Edit Dialog */}
      {editingAnnouncement && (
        <EditAnnouncementDialog
          announcement={editingAnnouncement}
          open={!!editingAnnouncement}
          onOpenChange={(open) => !open && setEditingAnnouncement(null)}
          onSuccess={() => {
            setEditingAnnouncement(null);
            fetchAnnouncements();
          }}
        />
      )}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  index,
  canEdit,
  onEdit,
  onDelete,
}: {
  announcement: Announcement;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const priority = priorityConfig[announcement.priority];
  const audience = audienceConfig[announcement.target_audience];
  const isExpired = announcement.expires_at && isPast(new Date(announcement.expires_at));

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcement.id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Announcement has been deleted',
      });
      onDelete();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete announcement',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn(
        'border-border/50 transition-all hover:shadow-md',
        announcement.is_pinned && 'border-primary/30 bg-primary/5',
        isExpired && 'opacity-60'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {announcement.is_pinned && (
                  <Badge variant="secondary" className="gap-1">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </Badge>
                )}
                <Badge className={cn('gap-1', priority.color)}>
                  {priority.icon && <priority.icon className="h-3 w-3" />}
                  {priority.label}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <audience.icon className="h-3 w-3" />
                  {audience.label}
                </Badge>
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{announcement.title}</CardTitle>
            </div>

            {canEdit && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <CardDescription className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
            {announcement.expires_at && (
              <>
                <span>•</span>
                <span>Expires {format(new Date(announcement.expires_at), 'MMM d, yyyy')}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CreateAnnouncementDialog({
  open,
  onOpenChange,
  onSuccess,
  schoolId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  schoolId: string | null;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'teachers' | 'staff'>('all');
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Title and content are required',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('announcements').insert({
        school_id: schoolId,
        created_by: user.id,
        title: title.trim(),
        content: content.trim(),
        priority,
        target_audience: targetAudience,
        is_pinned: isPinned,
        expires_at: expiresAt || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement created successfully',
      });
      
      onOpenChange(false);
      onSuccess();
      
      // Reset form
      setTitle('');
      setContent('');
      setPriority('normal');
      setTargetAudience('all');
      setIsPinned(false);
      setExpiresAt('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create announcement',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Create Announcement
          </DialogTitle>
          <DialogDescription>
            Post an announcement for your school or platform
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Announcement title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              placeholder="Write your announcement..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                  <SelectItem value="staff">Staff Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expires On (Optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pinned">Pin this announcement</Label>
            <Switch
              id="pinned"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            <Send className="h-4 w-4" />
            {submitting ? 'Posting...' : 'Post Announcement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
  onSuccess,
}: {
  announcement: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(announcement.title);
  const [content, setContent] = useState(announcement.content);
  const [priority, setPriority] = useState(announcement.priority);
  const [targetAudience, setTargetAudience] = useState(announcement.target_audience);
  const [isPinned, setIsPinned] = useState(announcement.is_pinned);
  const [expiresAt, setExpiresAt] = useState(announcement.expires_at?.split('T')[0] || '');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Title and content are required',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('announcements')
        .update({
          title: title.trim(),
          content: content.trim(),
          priority,
          target_audience: targetAudience,
          is_pinned: isPinned,
          expires_at: expiresAt || null,
        })
        .eq('id', announcement.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Announcement updated successfully',
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update announcement',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Announcement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="students">Students Only</SelectItem>
                  <SelectItem value="teachers">Teachers Only</SelectItem>
                  <SelectItem value="staff">Staff Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expires On</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pinned-edit">Pin this announcement</Label>
            <Switch
              id="pinned-edit"
              checked={isPinned}
              onCheckedChange={setIsPinned}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
