import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, FileText, File, Image as ImageIcon, Video, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  fileUrl,
  fileName,
  fileSize,
  fileType,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const loadFileUrl = async () => {
    if (imageUrl) return imageUrl;

    try {
      setLoading(true);
      
      // Extract path from URL if it's a full URL
      let filePath = fileUrl;
      if (fileUrl.includes('chat-files/')) {
        filePath = fileUrl.split('chat-files/')[1].split('?')[0];
      }

      const { data, error } = await supabase.storage
        .from('chat-files')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
        return data.signedUrl;
      }
    } catch (error: any) {
      console.error('File preview error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load file preview',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return null;
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Extract path from URL if it's a full URL
      let filePath = fileUrl;
      if (fileUrl.includes('chat-files/')) {
        filePath = fileUrl.split('chat-files/')[1].split('?')[0];
      }

      const { data, error } = await supabase.storage
        .from('chat-files')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Downloaded',
        description: `${fileName} has been downloaded`,
      });
    } catch (error: any) {
      console.error('File download error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to download file',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (fileType.startsWith('image/') || fileType.startsWith('video/')) {
      const url = await loadFileUrl();
      if (url) setShowPreview(true);
    }
  };

  const isPreviewable = fileType.startsWith('image/') || fileType.startsWith('video/');

  return (
    <>
      <div className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-lg max-w-sm group transition-all duration-200 hover:shadow-md">
        <div className="flex-shrink-0 text-primary animate-pulse-glow">{getFileIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
        </div>
        <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-all duration-200">
          {isPreviewable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
              onClick={handlePreview}
              disabled={loading}
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon()}
              <span className="truncate">{fileName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 bg-muted/30 rounded-lg p-4 animate-fade-in">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {imageUrl && fileType.startsWith('image/') && (
              <img
                src={imageUrl}
                alt={fileName}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-lg animate-zoom-in"
                onLoad={() => setLoading(false)}
              />
            )}
            {imageUrl && fileType.startsWith('video/') && (
              <video
                src={imageUrl}
                controls
                className="w-full h-auto max-h-[70vh] rounded-lg shadow-lg animate-zoom-in"
                onLoadedData={() => setLoading(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
