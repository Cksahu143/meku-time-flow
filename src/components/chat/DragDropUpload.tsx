import React, { useState, useCallback } from 'react';
import { Upload, X, FileIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragDropUploadProps {
  onFilesSelected: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFilesSelected,
  children,
  className,
  accept = '*',
  multiple = true,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      if (prev - 1 === 0) {
        setIsDragging(false);
      }
      return prev - 1;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);
    
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const validFiles = multiple ? files : [files[0]];
      onFilesSelected(validFiles);
    }
  }, [disabled, multiple, onFilesSelected]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn('relative', className)}
    >
      {children}
      
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg animate-pulse-glow">
          <div className="text-center animate-bounce-in">
            <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
            <p className="text-lg font-medium text-primary">Drop files here</p>
            <p className="text-sm text-muted-foreground">Release to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface FilePreviewListProps {
  files: File[];
  onRemove: (index: number) => void;
  uploading?: boolean;
}

export const FilePreviewList: React.FC<FilePreviewListProps> = ({
  files,
  onRemove,
  uploading = false
}) => {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg animate-slide-up">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="relative group flex items-center gap-2 px-3 py-2 bg-background rounded-lg border animate-scale-in"
        >
          {file.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="h-10 w-10 object-cover rounded"
            />
          ) : (
            <FileIcon className="h-10 w-10 text-muted-foreground" />
          )}
          
          <div className="max-w-[150px]">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <button
              onClick={() => onRemove(index)}
              className="absolute -top-1 -right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
