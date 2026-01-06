import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, ImageOff } from 'lucide-react';

interface ImageThumbnailProps {
  imageUrl: string;
  alt: string;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ imageUrl, alt }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadImage();
  }, [imageUrl]);

  const loadImage = async () => {
    setIsLoading(true);
    setError(false);

    try {
      // Check if it's already a full URL (public bucket or external)
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        setDisplayUrl(imageUrl);
        return;
      }

      // It's a path in storage - need to get signed URL from chat-files bucket
      let filePath = imageUrl;
      
      // Extract path if it contains bucket reference
      if (imageUrl.includes('chat-files/')) {
        filePath = imageUrl.split('chat-files/')[1].split('?')[0];
      }

      const { data, error: signError } = await supabase.storage
        .from('chat-files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (signError) {
        console.error('Error creating signed URL:', signError);
        setError(true);
        return;
      }

      if (data?.signedUrl) {
        setDisplayUrl(data.signedUrl);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error loading image:', err);
      setError(true);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg text-muted-foreground max-w-xs">
        <ImageOff className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Image unavailable</p>
          <p className="text-xs">Unable to load this image</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="relative rounded-lg overflow-hidden cursor-pointer group max-w-xs animate-fade-in hover-scale transition-all"
        onClick={() => displayUrl && setIsOpen(true)}
      >
        {isLoading && (
          <Skeleton className="w-full h-48 rounded-lg" />
        )}
        {displayUrl && (
          <img
            src={displayUrl}
            alt={alt}
            className="w-full h-auto max-h-[300px] object-cover transition-transform group-hover:scale-105"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: isLoading ? 'none' : 'block' }}
          />
        )}
        {!isLoading && displayUrl && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium drop-shadow-md">
              Click to enlarge
            </span>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-7xl p-0 overflow-hidden animate-zoom-in">
          {displayUrl && (
            <img
              src={displayUrl}
              alt={alt}
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
