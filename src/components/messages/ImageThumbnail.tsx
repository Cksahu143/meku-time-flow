import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ImageThumbnailProps {
  imageUrl: string;
  alt: string;
}

export const ImageThumbnail: React.FC<ImageThumbnailProps> = ({ imageUrl, alt }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <div 
        className="relative rounded-lg overflow-hidden cursor-pointer group max-w-xs animate-fade-in hover-scale transition-all"
        onClick={() => setIsOpen(true)}
      >
        {isLoading && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-auto max-h-[300px] object-cover transition-transform group-hover:scale-105"
          onLoad={() => setIsLoading(false)}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
            Click to enlarge
          </span>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-7xl p-0 overflow-hidden animate-zoom-in">
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-auto max-h-[90vh] object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};