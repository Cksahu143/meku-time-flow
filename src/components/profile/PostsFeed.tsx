import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PostsFeedProps {
  userId: string;
  currentUserId: string | null;
}

export const PostsFeed: React.FC<PostsFeedProps> = ({ userId, currentUserId }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const isOwnProfile = userId === currentUserId;

  useEffect(() => {
    fetchPosts();
    if (currentUserId) fetchLikedPosts();
  }, [userId, currentUserId]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Fetch profile for each post
      const postsWithProfiles = await Promise.all(data.map(async (post) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', post.user_id)
          .maybeSingle();
        return { ...post, profile };
      }));
      setPosts(postsWithProfiles);
    }
    setLoading(false);
  };

  const fetchLikedPosts = async () => {
    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', currentUserId!);
    
    if (data) {
      setLikedPosts(new Set(data.map(l => l.post_id)));
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !currentUserId) return;
    
    setPosting(true);
    const { data, error } = await supabase
      .from('posts')
      .insert({ user_id: currentUserId, content: newPost.trim() })
      .select()
      .single();
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewPost('');
      fetchPosts();
      
      // Log activity
      await supabase.from('user_activities').insert({
        user_id: currentUserId,
        activity_type: 'post',
        target_id: data.id,
        target_type: 'post'
      });
    }
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    
    const isLiked = likedPosts.has(postId);
    
    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', currentUserId);
      
      setLikedPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: currentUserId });
      
      setLikedPosts(prev => new Set([...prev, postId]));
      
      // Log activity
      await supabase.from('user_activities').insert({
        user_id: currentUserId,
        activity_type: 'like',
        target_id: postId,
        target_type: 'post'
      });
    }
    
    fetchPosts();
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({ title: 'Success', description: 'Post deleted.' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Create Post (only on own profile) */}
      {isOwnProfile && currentUserId && (
        <Card className="animate-scale-in">
          <CardContent className="p-4">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="resize-none mb-3"
            />
            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ImageIcon className="h-4 w-4 mr-2" />
                Add Photo
              </Button>
              <Button 
                onClick={handleCreatePost} 
                disabled={!newPost.trim() || posting}
                className="hover-scale"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Post
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="p-8 text-center text-muted-foreground">
            No posts yet.
          </CardContent>
        </Card>
      ) : (
        posts.map((post, index) => (
          <Card 
            key={post.id} 
            className="animate-slide-up overflow-hidden hover:shadow-md transition-shadow"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {(post.profile?.display_name || post.profile?.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{post.profile?.display_name || post.profile?.username || 'Anonymous'}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {currentUserId === post.user_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDelete(post.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  <p className="mt-2 whitespace-pre-wrap">{post.content}</p>
                  
                  {post.image_urls && post.image_urls.length > 0 && (
                    <div className="mt-3 grid gap-2">
                      {post.image_urls.map((url, i) => (
                        <img key={i} src={url} alt="" className="rounded-lg max-h-96 object-cover" />
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id)}
                      className={`gap-2 transition-all ${likedPosts.has(post.id) ? 'text-red-500 hover:text-red-600' : ''}`}
                    >
                      <Heart className={`h-4 w-4 transition-transform ${likedPosts.has(post.id) ? 'fill-current scale-110' : ''}`} />
                      {post.likes_count}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {post.comments_count}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
