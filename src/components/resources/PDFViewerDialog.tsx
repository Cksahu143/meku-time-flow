import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export const PDFViewerDialog: React.FC<PDFViewerDialogProps> = ({ open, onOpenChange, url, title }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    if (!open || !url) return;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err) {
        console.error('PDF load error:', err);
        setError('Failed to load PDF. Try downloading instead.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      setPdf(null);
    };
  }, [open, url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
    };

    renderPage();
  }, [pdf, currentPage, scale]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => window.open(url, '_blank')}>
              Try Opening Directly
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-2 py-1 border-b border-border">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(scale * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(3, s + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex justify-center bg-muted/30 rounded-lg p-4">
              <canvas ref={canvasRef} className="shadow-lg" />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
