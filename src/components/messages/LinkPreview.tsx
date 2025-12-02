import React from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, title, description, image }) => {
  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleClick}
      className="group mt-2 border border-border/50 rounded-lg overflow-hidden cursor-pointer hover:border-border transition-all hover:shadow-soft animate-fade-in hover-scale"
    >
      {image && (
        <div className="relative w-full h-40 bg-muted overflow-hidden">
          <img
            src={image}
            alt={title || url}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-3 bg-muted/30">
        <div className="flex items-start gap-2">
          <ExternalLink className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            {title && (
              <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                {title}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {description}
              </p>
            )}
            <p className="text-xs text-muted-foreground truncate mt-1">
              {new URL(url).hostname}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};