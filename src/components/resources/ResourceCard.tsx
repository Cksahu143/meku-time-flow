import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Link, Video, File, ExternalLink, Edit, Trash2, Type, Star, Download, Eye, FolderOpen } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ResourceCardProps {
  resource: Resource;
  onEdit?: (resource: Resource) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
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

export const ResourceCard: React.FC<ResourceCardProps> = ({ 
  resource, 
  onEdit, 
  onDelete,
  onToggleFavorite 
}) => {
  const Icon = typeIcons[resource.type];
  const [showPreview, setShowPreview] = useState(false);

  const handleOpen = () => {
    if (resource.type === 'text') {
      setShowPreview(true);
      return;
    }
    if (resource.url) {
      window.open(resource.url, '_blank');
    }
  };

  const handleDownload = () => {
    if (resource.url) {
      const link = document.createElement('a');
      link.href = resource.url;
      link.download = resource.fileName || resource.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isPDF = resource.type === 'pdf' || resource.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <>
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
          
          {/* Favorite star */}
          {onToggleFavorite && (
            <motion.button
              className="absolute top-3 right-3 z-10"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggleFavorite(resource.id)}
            >
              <Star 
                className={`h-5 w-5 transition-colors ${
                  resource.isFavorite 
                    ? 'fill-yellow-500 text-yellow-500' 
                    : 'text-muted-foreground hover:text-yellow-500'
                }`} 
              />
            </motion.button>
          )}
          
          <CardContent className="p-4 pt-5">
            <div className="flex items-start gap-3">
              <motion.div 
                className={`p-2.5 rounded-xl ${typeColors[resource.type]} transition-all duration-300`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <div className="flex-1 min-w-0 pr-8">
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
                  {resource.category && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {resource.category}
                    </Badge>
                  )}
                </div>
                
                {/* Chapter/Unit info */}
                {resource.chapter && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Chapter: {resource.chapter}
                  </p>
                )}
                
                {/* File size */}
                {resource.fileSize && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Size: {formatFileSize(resource.fileSize)}
                  </p>
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {resource.description}
            </p>

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {resource.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {resource.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{resource.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
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
          
          <CardFooter className="p-4 pt-0 flex gap-2">
            {/* Action buttons */}
            <div className="flex gap-1 mr-auto">
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

                {/* Download button for files */}
                {(resource.type === 'pdf' || resource.type === 'document') && resource.url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleDownload}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>

            {/* Main action button */}
            {resource.type !== 'text' && resource.url ? (
              <Button 
                onClick={handleOpen} 
                className="gap-2 group/btn flex-1"
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                {isPDF ? 'Preview PDF' : 'Open'}
              </Button>
            ) : resource.type === 'text' ? (
              <Button 
                onClick={() => setShowPreview(true)} 
                className="gap-2 flex-1"
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4" />
                View Content
              </Button>
            ) : (
              <Button 
                disabled
                className="gap-2 opacity-50 flex-1"
                variant="outline"
                size="sm"
              >
                No URL Available
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>

      {/* Content Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {resource.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {resource.type === 'text' && resource.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">
                  {resource.content}
                </pre>
              </div>
            ) : isPDF && resource.url ? (
              <div className="aspect-[8.5/11] w-full">
                <iframe
                  src={`${resource.url}#view=FitH`}
                  className="w-full h-full rounded-lg border"
                  title={resource.title}
                />
              </div>
            ) : (
              <p className="text-muted-foreground">No preview available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};