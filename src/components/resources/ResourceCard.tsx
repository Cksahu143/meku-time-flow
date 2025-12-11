import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Link, Video, File, ExternalLink, Edit, Trash2, Type } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Resource } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ResourceCardProps {
  resource: Resource;
  onEdit?: (resource: Resource) => void;
  onDelete?: (id: string) => void;
}

const typeIcons = {
  pdf: FileText,
  link: Link,
  video: Video,
  document: File,
  text: Type,
};

const typeColors = {
  pdf: 'bg-red-500/10 text-red-500 border-red-500/20',
  link: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  video: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  document: 'bg-green-500/10 text-green-500 border-green-500/20',
  text: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onEdit, onDelete }) => {
  const Icon = typeIcons[resource.type];

  const handleOpen = () => {
    if (resource.type === 'text') {
      // For text resources, could open a modal to view full content
      return;
    }
    if (resource.url) {
      window.open(resource.url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ y: -5 }}
      layout
    >
      <Card className="group relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-glow transition-all duration-300">
        {/* Shimmer effect on top edge */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <motion.div 
              className={`p-2.5 rounded-xl ${typeColors[resource.type]} transition-all duration-300`}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              <Icon className="h-5 w-5" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {resource.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {resource.subject}
                </Badge>
                <Badge variant="outline" className="text-xs uppercase">
                  {resource.type}
                </Badge>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TooltipProvider>
                {onEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(resource)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                )}
                
                {onDelete && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{resource.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(resource.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TooltipProvider>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {resource.description}
          </p>
          
          {/* Show content preview for text type */}
          {resource.type === 'text' && resource.content && (
            <motion.div 
              className="mt-3 p-3 rounded-lg bg-background/50 border border-border/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                {resource.content}
              </p>
            </motion.div>
          )}
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          {resource.type !== 'text' && resource.url ? (
            <Button 
              onClick={handleOpen} 
              className="w-full gap-2 group/btn"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 group-hover/btn:rotate-12 transition-transform" />
              Open Resource
            </Button>
          ) : resource.type === 'text' ? (
            <Button 
              onClick={() => onEdit?.(resource)} 
              className="w-full gap-2"
              variant="outline"
            >
              <Type className="h-4 w-4" />
              View Full Content
            </Button>
          ) : (
            <Button 
              disabled
              className="w-full gap-2 opacity-50"
              variant="outline"
            >
              No URL Available
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};
