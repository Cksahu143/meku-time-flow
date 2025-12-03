import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Play, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  created_at: string;
}

interface MediaGalleryProps {
  userId: string;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({ userId }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    fetchMedia();
  }, [userId]);

  const fetchMedia = async () => {
    // Get media from posts
    const { data: posts } = await supabase
      .from('posts')
      .select('id, image_urls, created_at')
      .eq('user_id', userId)
      .not('image_urls', 'eq', '{}')
      .order('created_at', { ascending: false });
    
    if (posts) {
      const mediaItems: MediaItem[] = [];
      posts.forEach(post => {
        if (post.image_urls) {
          post.image_urls.forEach((url: string) => {
            const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
            mediaItems.push({
              id: `${post.id}-${url}`,
              url,
              type: isVideo ? 'video' : 'image',
              created_at: post.created_at
            });
          });
        }
      });
      setMedia(mediaItems);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="p-8 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No media yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {media.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className="aspect-square relative overflow-hidden rounded-lg bg-muted group animate-scale-in"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            {item.type === 'video' ? (
              <>
                <video src={item.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                  <Play className="h-8 w-8 text-white" />
                </div>
              </>
            ) : (
              <img 
                src={item.url} 
                alt="" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>

      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedMedia?.type === 'video' ? (
            <video 
              src={selectedMedia.url} 
              controls 
              autoPlay 
              className="w-full max-h-[80vh]"
            />
          ) : (
            <img 
              src={selectedMedia?.url} 
              alt="" 
              className="w-full max-h-[80vh] object-contain animate-zoom-in"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
