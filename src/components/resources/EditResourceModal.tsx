import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Upload, Link as LinkIcon, FileText, File, Type, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RESOURCE_CATEGORIES } from '@/types';
import { DbResource, ResourceInput } from '@/hooks/useResources';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface EditResourceModalProps {
  resource: DbResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, input: Partial<ResourceInput>, file?: File | null) => Promise<void>;
  subjects: string[];
}

export const EditResourceModal: React.FC<EditResourceModalProps> = ({
  resource,
  open,
  onOpenChange,
  onSave,
  subjects,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<string>('pdf');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [chapter, setChapter] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isFileType = type === 'pdf' || type === 'document';
  const isLinkType = type === 'link' || type === 'video';
  const isTextType = type === 'text';

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setSubject(resource.subject);
      setType(resource.resource_type);
      setUrl(resource.url || '');
      setDescription(resource.description);
      setContent(resource.content || '');
      setCategory(resource.category || '');
      setChapter(resource.chapter || '');
      setTags(resource.tags || []);
    }
  }, [resource]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) { setTags([...tags, trimmedTag]); setTagInput(''); }
  };

  const handleRemoveTag = (tagToRemove: string) => { setTags(tags.filter(t => t !== tagToRemove)); };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
  };

  const validateUrl = (urlString: string): boolean => {
    if (!urlString) return true;
    try { new URL(urlString); return true; } catch { return false; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    if (!title || !subject || !description) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all required fields.' });
      return;
    }

    if (isLinkType && url && !validateUrl(url)) {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Please provide a valid URL starting with http:// or https://' });
      return;
    }

    setSaving(true);
    try {
      await onSave(resource.id, {
        title,
        subject,
        resource_type: type,
        url: isTextType ? undefined : (selectedFile ? undefined : url || resource.url || undefined),
        file_name: selectedFile?.name || resource.file_name || undefined,
        file_size: selectedFile?.size || resource.file_size || undefined,
        description,
        content: isTextType ? content : undefined,
        category: category || undefined,
        chapter: chapter || undefined,
        tags: tags.length > 0 ? tags : [],
      }, selectedFile);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Edit Resource
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter resource title" className="bg-background/50" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {RESOURCE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Chapter / Unit (optional)</Label>
              <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g., Chapter 5" className="bg-background/50" />
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v)}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="link"><div className="flex items-center gap-2"><LinkIcon className="h-4 w-4" />Link / URL</div></SelectItem>
                  <SelectItem value="pdf"><div className="flex items-center gap-2"><FileText className="h-4 w-4" />PDF File</div></SelectItem>
                  <SelectItem value="document"><div className="flex items-center gap-2"><File className="h-4 w-4" />Document / File</div></SelectItem>
                  <SelectItem value="video"><div className="flex items-center gap-2"><LinkIcon className="h-4 w-4" />Video Link</div></SelectItem>
                  <SelectItem value="text"><div className="flex items-center gap-2"><Type className="h-4 w-4" />Text Note</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <AnimatePresence mode="wait">
              {isTextType ? (
                <motion.div key="text" className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Label>Content *</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your notes here..." rows={6} className="bg-background/50 resize-none" />
                </motion.div>
              ) : isFileType ? (
                <motion.div key="file" className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Label>Upload New File or Update URL</Label>
                  <div className="space-y-3">
                    {(resource?.file_name || resource?.url) && !selectedFile && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm truncate">{resource.file_name || 'Current file'}</span>
                      </div>
                    )}
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <input ref={fileInputRef} type="file" accept={type === 'pdf' ? '.pdf' : '*'} onChange={handleFileSelect} className="hidden" />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="ml-2 h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload new {type === 'pdf' ? 'PDF' : 'file'}</p>
                        </>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or update URL</span></div>
                    </div>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/file.pdf" className="pl-9 bg-background/50" disabled={!!selectedFile} />
                    </div>
                  </div>
                </motion.div>
              ) : isLinkType ? (
                <motion.div key="url" className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Label>URL *</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="pl-9 bg-background/50" />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" rows={2} className="bg-background/50 resize-none" />
            </div>

            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyPress} placeholder="Add a tag and press Enter" className="bg-background/50" />
                <Button type="button" variant="outline" onClick={handleAddTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      #{tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
