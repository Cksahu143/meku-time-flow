import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  FileText, 
  Download, 
  Save, 
  X, 
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Link2,
  FileAudio,
  Sparkles,
  Shield
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
import { useSSO } from '@/hooks/useSSO';

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
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState(true);
  
  const { generateSSOToken, buildSSOUrl } = useSSO();

  // Generate SSO token and build URL on mount
  useEffect(() => {
    const initSSO = async () => {
      setSsoLoading(true);
      try {
        const tokenData = await generateSSOToken();
        if (tokenData?.token) {
          const url = buildSSOUrl(TRANSCRIBE_APP_URL, tokenData.token);
          setSsoUrl(url);
        } else {
          // Fall back to regular URL if SSO fails
          setSsoUrl(TRANSCRIBE_APP_URL);
        }
      } catch (error) {
        console.error('SSO initialization error:', error);
        setSsoUrl(TRANSCRIBE_APP_URL);
      } finally {
        setSsoLoading(false);
      }
    };

    initSSO();
  }, [generateSSOToken, buildSSOUrl]);

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
      const existingResources = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      
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
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${resourceTitle || 'Transcription'}</title>
            <style>
              body { font-family: 'Inter', Arial, sans-serif; padding: 40px; line-height: 1.6; color: #1a1a2e; }
              h1 { color: #0066ff; border-bottom: 2px solid #0066ff; padding-bottom: 10px; }
              h2 { color: #0052cc; margin-top: 30px; }
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

  const handleOpenExternal = async () => {
    if (ssoUrl) {
      window.open(ssoUrl, '_blank');
    } else {
      window.open(TRANSCRIBE_APP_URL, '_blank');
    }
  };

  return (
    <motion.div 
      className="h-full flex flex-col p-4 md:p-8 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
          <motion.div 
            className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg btn-glow"
            whileHover={{ scale: 1.05, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic className="h-7 w-7 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gradient-blue">AI Transcribe</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Convert audio, video, or links into English study notes
            </p>
          </div>
        </div>
        
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenExternal}
            className="gap-2 hover-glow"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats Row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        {[
          { icon: FileAudio, label: 'Transcription Items', value: '2,340' },
          { icon: Loader2, label: 'Minutes processed', value: '415h' },
          { icon: FileText, label: 'Study notebooks', value: '140+' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm"
            whileHover={{ y: -2 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <stat.icon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
        <motion.div
          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm col-span-2 md:col-span-2"
          whileHover={{ y: -2 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Shield className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">No permanent storage</p>
            <p className="text-xs text-muted-foreground">Built for students & teachers • Fast & lightweight</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Action Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid md:grid-cols-2 gap-6"
      >
        {/* AI Actions */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Upload, label: 'Transcribe File', desc: 'Transform into detailed' },
                { icon: Link2, label: 'Transcribe URL', desc: 'Transcribe URL video' },
                { icon: FileText, label: 'View Recent Notes', desc: 'Open Recent Notes' },
              ].map((action, i) => (
                <motion.button
                  key={action.label}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-primary/30 transition-all group"
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  onClick={() => iframeRef.current?.contentWindow?.postMessage({ type: 'ACTION', action: action.label }, '*')}
                >
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{action.desc}</span>
                </motion.button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Files are processed temporarily, not stored permanently.
            </p>
          </CardContent>
        </Card>

        {/* About Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">About Cohen - EDAS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cohen-EDAS is your all-in-one school planning and AI companion. Designed to help students 
              reduce pressure, not replace teachers. Convert any audio or video into organized study notes instantly.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <FileText className="h-4 w-4" />
                Get Quick Info
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <Sparkles className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Embedded Transcription App */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="flex-1 min-h-[400px] relative rounded-2xl overflow-hidden border border-border/50 shadow-lg bg-card"
      >
        <AnimatePresence>
          {(ssoLoading || !iframeLoaded) && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center bg-card z-10"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center space-y-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="h-10 w-10 text-primary mx-auto" />
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {ssoLoading ? 'Authenticating via SSO...' : 'Loading transcription tool...'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ssoLoading ? 'Securely connecting to EDAS' : 'Please wait'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {ssoUrl && (
          <iframe
            ref={iframeRef}
            src={ssoUrl}
            className="w-full h-full border-0"
            title="AI Transcription Tool"
            allow="microphone; clipboard-write"
            onLoad={() => setIframeLoaded(true)}
            style={{ 
              minHeight: '400px',
              opacity: iframeLoaded && !ssoLoading ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          />
        )}
      </motion.div>

      {/* Manual Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Manual Transcript Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If the embedded tool doesn't communicate automatically, paste your results here to save them.
            </p>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button 
                variant="outline" 
                onClick={() => {
                  setTranscriptData({ transcript: '', notes: '', summary: '' });
                  setResourceTitle('Manual Transcription');
                  setShowSaveDialog(true);
                }}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Manually Enter Transcript
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
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
              <Button onClick={handleSaveToResources} disabled={isSaving} className="btn-glow">
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
    </motion.div>
  );
};