import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Maximize2 } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, fileName }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <>
      <div className="group relative bg-muted/30 rounded-lg p-4 border border-border/50 hover:border-border transition-all hover:shadow-soft animate-fade-in">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-destructive animate-pulse-glow" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">PDF Document</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullScreen(true)}
            className="opacity-0 group-hover:opacity-100 transition-all hover-scale"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 rounded-md overflow-hidden border border-border/30">
          <iframe
            src={fileUrl}
            className="w-full h-[300px] bg-background"
            title={fileName}
          />
        </div>
      </div>

      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-6xl h-[90vh] animate-scale-in">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-destructive" />
              {fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 rounded-lg overflow-hidden border border-border">
            <iframe
              src={fileUrl}
              className="w-full h-full bg-background"
              title={fileName}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};