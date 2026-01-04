import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Mic, 
  FileText, 
  Download, 
  Save, 
  X, 
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const TRANSCRIBE_APP_URL = 'https://bhakticonvert.lovable.app';
const STORAGE_KEY = 'meku-resources';

interface TranscriptData {
  transcript?: string;
  notes?: string;
  summary?: string;
  title?: string;
}

export const TranscribeView: React.FC = () => {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Listen for postMessage from the embedded app
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (!event.origin.includes('lovable.app')) return;
      
      const { type, data } = event.data || {};
      
      if (type === 'TRANSCRIPTION_COMPLETE' && data) {
        setTranscriptData(data);
        setResourceTitle(data.title || `Transcription - ${new Date().toLocaleDateString()}`);
        setShowSaveDialog(true);
        
        toast({
          title: 'Transcription Complete',
          description: 'Your transcription is ready to save.',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

  const handleSaveToResources = useCallback(async () => {
    if (!transcriptData) return;
    
    setIsSaving(true);
    
    try {
      // Get existing resources from localStorage
      const existingResources = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      
      // Create new resource
      const newResource = {
        id: crypto.randomUUID(),
        title: resourceTitle || 'AI Transcription',
        subject: 'AI Transcription Notes',
        type: 'text' as const,
        description: transcriptData.summary || 'AI-generated transcription',
        content: [
          transcriptData.transcript && `## Transcript\n\n${transcriptData.transcript}`,
          transcriptData.notes && `## Notes\n\n${transcriptData.notes}`,
          transcriptData.summary && `## Summary\n\n${transcriptData.summary}`,
        ].filter(Boolean).join('\n\n---\n\n'),
        category: 'Notes',
        tags: ['AI Transcription', 'Auto-generated'],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newResource, ...existingResources]));
      
      toast({
        title: 'Saved to Resources',
        description: 'Transcription saved under "AI Transcription Notes"',
      });
      
      setShowSaveDialog(false);
      setTranscriptData(null);
    } catch (error) {
      console.error('Error saving resource:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save transcription to resources.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [transcriptData, resourceTitle, toast]);

  const handleDownload = useCallback((format: 'txt' | 'pdf') => {
    if (!transcriptData) return;
    
    const content = [
      transcriptData.title && `# ${transcriptData.title}`,
      '',
      transcriptData.transcript && `## Transcript\n\n${transcriptData.transcript}`,
      transcriptData.notes && `## Notes\n\n${transcriptData.notes}`,
      transcriptData.summary && `## Summary\n\n${transcriptData.summary}`,
    ].filter(Boolean).join('\n\n');
    
    if (format === 'txt') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resourceTitle || 'transcription'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Downloaded',
        description: 'Transcription downloaded as TXT file.',
      });
    } else if (format === 'pdf') {
      // Create a simple PDF using browser print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${resourceTitle || 'Transcription'}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              h2 { color: #555; margin-top: 30px; }
              p { margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>${resourceTitle || 'Transcription'}</h1>
            ${transcriptData.transcript ? `<h2>Transcript</h2><p>${transcriptData.transcript.replace(/\n/g, '<br>')}</p>` : ''}
            ${transcriptData.notes ? `<h2>Notes</h2><p>${transcriptData.notes.replace(/\n/g, '<br>')}</p>` : ''}
            ${transcriptData.summary ? `<h2>Summary</h2><p>${transcriptData.summary.replace(/\n/g, '<br>')}</p>` : ''}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
      
      toast({
        title: 'PDF Ready',
        description: 'Use your browser print dialog to save as PDF.',
      });
    }
  }, [transcriptData, resourceTitle, toast]);

  const handleOpenExternal = () => {
    window.open(TRANSCRIBE_APP_URL, '_blank');
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-primary">
            <Mic className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Transcribe</h1>
            <p className="text-sm text-muted-foreground">
              Convert audio & video to text with AI
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">How it works</p>
                <p className="text-muted-foreground">
                  Upload your audio/video files or paste URLs in the tool below. 
                  Once transcription is complete, you can save it to your Resources 
                  or download as TXT/PDF.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Embedded Transcription App */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 min-h-[500px] relative rounded-xl overflow-hidden border border-border shadow-lg"
      >
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading transcription tool...</p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={TRANSCRIBE_APP_URL}
          className="w-full h-full border-0"
          title="AI Transcription Tool"
          allow="microphone; clipboard-write"
          onLoad={() => setIframeLoaded(true)}
          style={{ 
            minHeight: '500px',
            opacity: iframeLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      </motion.div>

      {/* Manual Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manual Transcript Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If the embedded tool doesn't communicate automatically, you can paste your transcription results here to save them.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setTranscriptData({ transcript: '', notes: '', summary: '' });
                setResourceTitle('Manual Transcription');
                setShowSaveDialog(true);
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Manually Enter Transcript
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Save Transcription
            </DialogTitle>
            <DialogDescription>
              Save your transcription to Resources or download it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                placeholder="Enter a title for this transcription"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript</Label>
              <Textarea
                id="transcript"
                value={transcriptData?.transcript || ''}
                onChange={(e) => setTranscriptData(prev => ({ ...prev, transcript: e.target.value }))}
                placeholder="Paste or edit the transcript here..."
                rows={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={transcriptData?.notes || ''}
                onChange={(e) => setTranscriptData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="summary">Summary (Optional)</Label>
              <Textarea
                id="summary"
                value={transcriptData?.summary || ''}
                onChange={(e) => setTranscriptData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Add a summary..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload('txt')}>
                <Download className="h-4 w-4 mr-1" />
                TXT
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={handleSaveToResources} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save to Resources
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
