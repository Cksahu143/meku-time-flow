import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface PhotoCollageProps {
  images: Array<{ url: string; alt: string }>;
}

export const PhotoCollage: React.FC<PhotoCollageProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images.length !== 4) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 max-w-md rounded-lg overflow-hidden animate-fade-in">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square cursor-pointer group overflow-hidden hover-scale transition-all"
            onClick={() => setSelectedImage(image.url)}
          >
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-7xl p-0 overflow-hidden animate-zoom-in">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};