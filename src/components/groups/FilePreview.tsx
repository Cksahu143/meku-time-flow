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
      const { data } = await supabase.storage
        .from('chat-files')
        .createSignedUrl(fileUrl, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
        return data.signedUrl;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load file',
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

      const { data, error } = await supabase.storage
        .from('chat-files')
        .download(fileUrl);

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
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg max-w-sm group">
        <div className="flex-shrink-0 text-primary">{getFileIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isPreviewable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePreview}
              disabled={loading}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {imageUrl && fileType.startsWith('image/') && (
              <img
                src={imageUrl}
                alt={fileName}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
            {imageUrl && fileType.startsWith('video/') && (
              <video
                src={imageUrl}
                controls
                className="w-full h-auto max-h-[70vh] rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
