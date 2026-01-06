import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoCollageProps {
  images: Array<{ url: string; alt: string }>;
}

export const PhotoCollage: React.FC<PhotoCollageProps> = ({ images }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [signedUrls, setSignedUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<boolean[]>([]);

  useEffect(() => {
    loadSignedUrls();
  }, [images]);

  const loadSignedUrls = async () => {
    setLoading(true);
    const urls: (string | null)[] = [];

    for (const image of images) {
      try {
        // Check if it's already a full URL
        if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
          urls.push(image.url);
          continue;
        }

        // Extract path and get signed URL
        let filePath = image.url;
        if (image.url.includes('chat-files/')) {
          filePath = image.url.split('chat-files/')[1].split('?')[0];
        }

        const { data, error } = await supabase.storage
          .from('chat-files')
          .createSignedUrl(filePath, 3600);

        if (error || !data?.signedUrl) {
          urls.push(null);
        } else {
          urls.push(data.signedUrl);
        }
      } catch {
        urls.push(null);
      }
    }

    setSignedUrls(urls);
    setLoadedImages(new Array(urls.length).fill(false));
    setLoading(false);
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (images.length !== 4) {
    return null;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden max-w-md">
        {images.map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden max-w-md animate-fade-in">
        {images.map((image, index) => {
          const url = signedUrls[index];
          const isImageLoaded = loadedImages[index];

          return (
            <div
              key={index}
              className="relative aspect-square cursor-pointer group overflow-hidden hover-scale transition-all"
              onClick={() => url && setSelectedIndex(index)}
            >
              {!isImageLoaded && url && (
                <Skeleton className="absolute inset-0" />
              )}
              {url ? (
                <img
                  src={url}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  onLoad={() => handleImageLoad(index)}
                  style={{ opacity: isImageLoaded ? 1 : 0 }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <ImageOff className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {url && isImageLoaded && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-7xl p-0 overflow-hidden animate-zoom-in">
          {selectedIndex !== null && signedUrls[selectedIndex] && (
            <div className="relative">
              <img
                src={signedUrls[selectedIndex]!}
                alt={images[selectedIndex].alt}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
              {images.length > 1 && (
                <>
                  {selectedIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  )}
                  {selectedIndex < images.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                      onClick={handleNext}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  )}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === selectedIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                        onClick={() => setSelectedIndex(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
