import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  FileText, 
  Download, 
  Save, 
  X, 
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
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STORAGE_KEY = 'meku-resources';

interface TranscriptData {
  transcript?: string;
  notes?: string;
  summary?: string;
  title?: string;
  detectedLanguage?: string;
  languageName?: string;
  wasTranslated?: boolean;
  originalText?: string;
}

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'or', label: 'Odia' },
];

export const TranscribeView: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/webm', 'video/mp4', 'video/webm'];
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please upload an audio or video file (MP3, WAV, M4A, MP4, WebM)',
        });
        return;
      }

      // Validate file size (max 25MB for Whisper API)
      if (file.size > 25 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload a file smaller than 25MB',
        });
        return;
      }

      setSelectedFile(file);
      transcribeFile(file, selectedLanguage);
    }
  };

  const transcribeFile = async (file: File, language: string = 'auto') => {
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', language);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use transcription');
      }

      const response = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Transcription failed');
      }

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }

      setTranscriptData({
        transcript: result.transcript,
        notes: result.notes,
        summary: result.summary,
        title: file.name.replace(/\.[^/.]+$/, ''),
        detectedLanguage: result.detectedLanguage,
        languageName: result.languageName,
        wasTranslated: result.wasTranslated,
        originalText: result.originalText,
      });
      setResourceTitle(file.name.replace(/\.[^/.]+$/, '') + ' - Transcription');
      setShowSaveDialog(true);

      toast({
        title: 'Transcription Complete',
        description: 'Your audio has been transcribed successfully!',
      });

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription Failed',
        description: error instanceof Error ? error.message : 'Unable to transcribe the audio. Please try again.',
      });
    } finally {
      setIsTranscribing(false);
      setSelectedFile(null);
    }
  };

  const transcribeUrl = async () => {
    if (!audioUrl.trim()) {
      toast({
        variant: 'destructive',
        title: 'URL Required',
        description: 'Please enter a valid audio or video URL',
      });
      return;
    }

    setShowUrlDialog(false);
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('url', audioUrl.trim());
      formData.append('language', selectedLanguage);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to use transcription');
      }

      const response = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Transcription failed');
      }

      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Transcription failed');
      }

      setTranscriptData({
        transcript: result.transcript,
        notes: result.notes,
        summary: result.summary,
        title: 'URL Transcription',
        detectedLanguage: result.detectedLanguage,
        languageName: result.languageName,
        wasTranslated: result.wasTranslated,
        originalText: result.originalText,
      });
      setResourceTitle('URL Transcription - ' + new Date().toLocaleDateString());
      setShowSaveDialog(true);

      toast({
        title: 'Transcription Complete',
        description: 'Your audio has been transcribed successfully!',
      });

    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription Failed',
        description: error instanceof Error ? error.message : 'Unable to transcribe the URL. Please try again.',
      });
    } finally {
      setIsTranscribing(false);
      setAudioUrl('');
    }
  };

  const handleSaveToResources = useCallback(async () => {
    if (!transcriptData) return;

    // Validate that at least transcript is filled
    if (!transcriptData.transcript?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Transcript Required',
        description: 'Please enter a transcript before saving.',
      });
      return;
    }
    
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
        category: 'AI Transcription Notes',
        tags: ['AI Transcription', 'Auto-generated'],
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify([newResource, ...existingResources]));
      
      toast({
        title: 'Saved Successfully',
        description: 'Transcription saved under "AI Transcription Notes" in Resources',
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
      resourceTitle && `# ${resourceTitle}`,
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

  const openManualEntry = () => {
    setTranscriptData({ transcript: '', notes: '', summary: '' });
    setResourceTitle('Manual Transcription - ' + new Date().toLocaleDateString());
    setShowSaveDialog(true);
  };

  return (
    <motion.div 
      className="h-full flex flex-col p-4 md:p-8 space-y-6 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

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
              Convert audio & video into English study notes
            </p>
          </div>
        </div>
      </motion.div>

      {/* Language Selection & Stats Row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        {/* Language Selector */}
        <motion.div
          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm col-span-2 md:col-span-1"
          whileHover={{ y: -2 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="w-full">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Language</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
        {[
          { icon: FileAudio, label: 'Supported formats', value: 'MP3, WAV, M4A' },
          { icon: Upload, label: 'Max file size', value: '25 MB' },
          { icon: FileText, label: 'Output', value: 'Notes + Summary' },
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
              <p className="text-sm font-medium text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
        <motion.div
          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm"
          whileHover={{ y: -2 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Shield className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-foreground">Secure</p>
            <p className="text-xs text-muted-foreground">Server-side processing</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Action Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {/* Upload File Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" />
              Upload File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload an audio or video file to transcribe
            </p>
            <Button 
              className="w-full gap-2 btn-glow"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTranscribing}
            >
              {isTranscribing && selectedFile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Choose File
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* URL Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5 text-primary" />
              From URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste a direct link to an audio file
            </p>
            <Button 
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowUrlDialog(true)}
              disabled={isTranscribing}
            >
              <Link2 className="h-4 w-4" />
              Enter URL
            </Button>
          </CardContent>
        </Card>

        {/* Manual Entry Card */}
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Manual Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Type or paste text manually to save
            </p>
            <Button 
              variant="outline"
              className="w-full gap-2"
              onClick={openManualEntry}
              disabled={isTranscribing}
            >
              <FileText className="h-4 w-4" />
              Enter Text
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Processing Indicator */}
      <AnimatePresence>
        {isTranscribing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 min-h-[200px] flex items-center justify-center"
          >
            <Card className="p-8 text-center border-border/50 shadow-lg">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="inline-block mb-4"
              >
                <Loader2 className="h-12 w-12 text-primary" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">Transcribing Audio...</h3>
              <p className="text-sm text-muted-foreground">
                This may take a moment depending on the file size
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      {!isTranscribing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Upload an audio/video file or enter a direct URL
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  AI processes and transcribes your content
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Get transcript, notes, and summary automatically
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  Save to Resources or download as TXT/PDF
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* URL Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Transcribe from URL
            </DialogTitle>
            <DialogDescription>
              Enter a direct link to an audio or video file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="audio-url">Audio/Video URL</Label>
              <Input
                id="audio-url"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
                type="url"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              URL must point directly to an audio/video file (MP3, WAV, M4A, MP4)
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUrlDialog(false)}>
              Cancel
            </Button>
            <Button onClick={transcribeUrl} disabled={!audioUrl.trim()}>
              <Sparkles className="h-4 w-4 mr-2" />
              Transcribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Save Transcription
            </DialogTitle>
            <DialogDescription>
              Review, edit, and save your transcription to Resources or download it.
            </DialogDescription>
          </DialogHeader>

          {/* Language Detection Info */}
          {transcriptData?.detectedLanguage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Detected Language:</span>
                <span className="text-sm text-primary font-semibold">
                  {transcriptData.languageName || transcriptData.detectedLanguage}
                </span>
              </div>
              {transcriptData.wasTranslated && (
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium">
                  Translated to English
                </span>
              )}
            </motion.div>
          )}
          
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
              <Label htmlFor="transcript">
                Transcript <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="transcript"
                value={transcriptData?.transcript || ''}
                onChange={(e) => setTranscriptData(prev => ({ ...prev, transcript: e.target.value }))}
                placeholder="Paste or edit the transcript here..."
                rows={6}
              />
              {transcriptData && !transcriptData.transcript?.trim() && (
                <p className="text-xs text-destructive">Transcript is required to save</p>
              )}
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
              <Button 
                onClick={handleSaveToResources} 
                disabled={isSaving || !transcriptData?.transcript?.trim()} 
                className="btn-glow"
              >
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
