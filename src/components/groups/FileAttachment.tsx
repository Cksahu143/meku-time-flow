import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, Image, FileText, File, Video } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface FileAttachmentProps {
  onFileSelect: (file: File) => void;
  onSend: (file: File) => Promise<void>;
  disabled?: boolean;
}

export const FileAttachment: React.FC<FileAttachmentProps> = ({
  onFileSelect,
  onSend,
  disabled,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 50MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);

    // Generate preview for images and videos
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setProgress(0);

      // Simulate progress (in real implementation, track actual upload progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      await onSend(selectedFile);

      clearInterval(progressInterval);
      setProgress(100);

      // Reset
      setTimeout(() => {
        setSelectedFile(null);
        setPreview(null);
        setProgress(0);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 500);
    } catch (error: any) {
      setUploading(false);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = () => {
    if (!selectedFile) return <File className="h-4 w-4" />;
    if (selectedFile.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (selectedFile.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (selectedFile.type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx"
        disabled={disabled || uploading}
      />

      {!selectedFile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      ) : (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Send File</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {preview && selectedFile.type.startsWith('image/') && (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-contain rounded-lg bg-muted"
              />
            )}

            {preview && selectedFile.type.startsWith('video/') && (
              <video
                src={preview}
                controls
                className="w-full h-48 rounded-lg bg-muted"
              />
            )}

            {!preview && (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                {getFileIcon()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">
                  Uploading... {progress}%
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={uploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
