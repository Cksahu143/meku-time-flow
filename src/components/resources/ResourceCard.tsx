import React, { useState } from 'react';
import { PDFViewerDialog } from './PDFViewerDialog';
import { motion } from 'framer-motion';
import { FileText, Link, Video, File, Edit, Trash2, Type, Star, Download, Eye, FolderOpen, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DbResource } from '@/hooks/useResources';
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
  resource: DbResource;
  onEdit?: (resource: DbResource) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

const typeIcons: Record<string, any> = {
  pdf: FileText,
  link: Link,
  video: Video,
  document: File,
  text: Type,
};

const typeColors: Record<string, string> = {
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
  const Icon = typeIcons[resource.resource_type] || File;
  const [showPreview, setShowPreview] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isPDF = resource.resource_type === 'pdf' || resource.file_name?.toLowerCase().endsWith('.pdf');

  const handleOpen = () => {
    if (resource.resource_type === 'text') {
      setShowPreview(true);
      return;
    }
    if (isPDF && resource.url) {
      setShowPdfViewer(true);
      return;
    }
    if (resource.url) {
      window.open(resource.url, '_blank');
    }
  };

  const handleDownload = async () => {
    if (!resource.url) return;
    setDownloading(true);
    try {
      const response = await fetch(resource.url);
      if (!response.ok) throw new Error('Fetch failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.file_name || resource.title;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch {
      window.open(resource.url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {onToggleFavorite && (
            <motion.button
              className="absolute top-3 right-3 z-10"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggleFavorite(resource.id)}
            >
              <Star 
                className={`h-5 w-5 transition-colors ${
                  resource.is_favorite 
                    ? 'fill-yellow-500 text-yellow-500' 
                    : 'text-muted-foreground hover:text-yellow-500'
                }`} 
              />
            </motion.button>
          )}
          
          <CardContent className="p-4 pt-5">
            <div className="flex items-start gap-3">
              <motion.div 
                className={`p-2.5 rounded-xl ${typeColors[resource.resource_type] || 'bg-muted'} transition-all duration-300`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <div className="flex-1 min-w-0 pr-8">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {resource.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{resource.subject}</Badge>
                  <Badge variant="outline" className="text-xs uppercase">{resource.resource_type}</Badge>
                  {resource.category && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {resource.category}
                    </Badge>
                  )}
                </div>
                
                {resource.chapter && (
                  <p className="text-xs text-muted-foreground mt-1">Chapter: {resource.chapter}</p>
                )}
                
                {resource.file_size && (
                  <p className="text-xs text-muted-foreground mt-1">Size: {formatFileSize(resource.file_size)}</p>
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{resource.description}</p>

            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {resource.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">#{tag}</Badge>
                ))}
                {resource.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">+{resource.tags.length - 3}</Badge>
                )}
              </div>
            )}
            
            {resource.resource_type === 'text' && resource.content && (
              <motion.div 
                className="mt-3 p-3 rounded-lg bg-background/50 border border-border/50"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{resource.content}</p>
              </motion.div>
            )}
          </CardContent>
          
          <CardFooter className="p-4 pt-0 flex gap-2">
            <div className="flex gap-1 mr-auto">
              <TooltipProvider>
                {onEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(resource)}>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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

                {(resource.resource_type === 'pdf' || resource.resource_type === 'document') && resource.url && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} disabled={downloading}>
                        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>

            {resource.resource_type !== 'text' && resource.url ? (
              <Button onClick={handleOpen} className="gap-2 group/btn flex-1" variant="outline" size="sm">
                <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                Open
              </Button>
            ) : resource.resource_type === 'text' ? (
              <Button onClick={() => setShowPreview(true)} className="gap-2 flex-1" variant="outline" size="sm">
                <Eye className="h-4 w-4" />
                View Content
              </Button>
            ) : (
              <Button disabled className="gap-2 opacity-50 flex-1" variant="outline" size="sm">
                No URL Available
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {resource.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {resource.resource_type === 'text' && resource.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg">{resource.content}</pre>
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
