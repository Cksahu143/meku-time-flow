import React from 'react';
import { FileText, Link, Video, File, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Resource } from '@/types';

interface ResourceCardProps {
  resource: Resource;
}

const typeIcons = {
  pdf: FileText,
  link: Link,
  video: Video,
  document: File,
};

const typeColors = {
  pdf: 'bg-red-500/10 text-red-500 border-red-500/20',
  link: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  video: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  document: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const Icon = typeIcons[resource.type];

  const handleOpen = () => {
    if (resource.url) {
      window.open(resource.url, '_blank');
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg ${typeColors[resource.type]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {resource.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {resource.subject}
              </Badge>
              <Badge variant="outline" className="text-xs uppercase">
                {resource.type}
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
          {resource.description}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          onClick={handleOpen} 
          className="w-full gap-2"
          variant="outline"
        >
          <ExternalLink className="h-4 w-4" />
          Open Resource
        </Button>
      </CardFooter>
    </Card>
  );
};
