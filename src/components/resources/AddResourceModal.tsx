import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Link as LinkIcon, Type, FileText, X, File, Loader2, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ResourceInput } from '@/hooks/useResources';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { SubjectCombobox } from './SubjectCombobox';
import { BookSearchDialog } from './BookSearchDialog';

interface AddResourceModalProps {
  onAddResource: (input: ResourceInput, file?: File | null) => Promise<void>;
  subjects: string[];
}

export const AddResourceModal: React.FC<AddResourceModalProps> = ({
  onAddResource,
  subjects,
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<string>('link');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [chapter, setChapter] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isFileType = type === 'pdf' || type === 'document';
  const isLinkType = type === 'link' || type === 'video';
  const isTextType = type === 'text';
  const isBookType = type === 'book';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
  };

  const validateUrl = (urlString: string): boolean => {
    try { new URL(urlString); return true; } catch { return false; }
  };

  const handleBookSelect = (book: any) => {
    setSelectedBook(book);
    setTitle(book.title);
    if (!subject) setSubject(book.author ? 'General' : '');
    setUrl(book.sourceUrl || '');
    setDescription(book.description || `${book.title} by ${book.author}`);
    if (!tags.includes('book')) setTags(prev => [...prev, 'book']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !subject || !description) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all required fields.' });
      return;
    }

    if (isTextType && !content) {
      toast({ variant: 'destructive', title: 'Missing content', description: 'Please add content for text resources.' });
      return;
    }

    if (isLinkType && !url) {
      toast({ variant: 'destructive', title: 'Missing URL', description: 'Please provide a valid URL.' });
      return;
    }

    if (isLinkType && url && !validateUrl(url)) {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Please provide a valid URL starting with http:// or https://' });
      return;
    }

    if (isFileType && !selectedFile && !url) {
      toast({ variant: 'destructive', title: 'Missing file', description: 'Please upload a file or provide a file URL.' });
      return;
    }

    if (isBookType && !selectedBook) {
      toast({ variant: 'destructive', title: 'No book selected', description: 'Please search and select a book.' });
      return;
    }

    setSaving(true);
    try {
      const bookContent = selectedBook
        ? `Book: ${selectedBook.title}\nAuthor: ${selectedBook.author}\nYear: ${selectedBook.publishYear}\nDescription: ${selectedBook.description || ''}\nCover: ${selectedBook.coverUrl || ''}`
        : undefined;

      await onAddResource({
        title,
        subject,
        resource_type: isBookType ? 'book' : type,
        url: isTextType ? undefined : (selectedFile ? undefined : url || undefined),
        file_name: selectedFile?.name,
        file_size: selectedFile?.size,
        description,
        content: isTextType ? content : isBookType ? bookContent : undefined,
        category: category || undefined,
        chapter: chapter || undefined,
        tags: tags.length > 0 ? tags : undefined,
      }, selectedFile);
      resetForm();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setSubject(''); setType('link'); setUrl(''); setDescription('');
    setContent(''); setCategory(''); setChapter(''); setTags([]); setTagInput('');
    setSelectedFile(null); setSelectedBook(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
        <DialogTrigger asChild>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2 shadow-md hover:shadow-glow transition-shadow">
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
          </motion.div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add New Resource
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter resource title" className="bg-background/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <SubjectCombobox value={subject} onChange={setSubject} subjects={subjects} className="bg-background/50" />
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
                <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g., Chapter 5: Thermodynamics" className="bg-background/50" />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={(v) => { setType(v); setUrl(''); setContent(''); setSelectedFile(null); setSelectedBook(null); }}>
                  <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link"><div className="flex items-center gap-2"><LinkIcon className="h-4 w-4" />Link / URL</div></SelectItem>
                    <SelectItem value="pdf"><div className="flex items-center gap-2"><FileText className="h-4 w-4" />PDF File</div></SelectItem>
                    <SelectItem value="document"><div className="flex items-center gap-2"><File className="h-4 w-4" />Document / File</div></SelectItem>
                    <SelectItem value="video"><div className="flex items-center gap-2"><LinkIcon className="h-4 w-4" />Video Link</div></SelectItem>
                    <SelectItem value="text"><div className="flex items-center gap-2"><Type className="h-4 w-4" />Text Note</div></SelectItem>
                    <SelectItem value="book"><div className="flex items-center gap-2"><BookOpen className="h-4 w-4" />📚 Book</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AnimatePresence mode="wait">
                {isBookType ? (
                  <motion.div key="book" className="space-y-3" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    {selectedBook ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                        {selectedBook.coverUrl && (
                          <img src={selectedBook.coverUrl} alt="" className="h-16 w-12 object-cover rounded" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">📖 {selectedBook.title}</p>
                          <p className="text-xs text-muted-foreground">{selectedBook.author} {selectedBook.publishYear && `(${selectedBook.publishYear})`}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSelectedBook(null); setTitle(''); setDescription(''); setUrl(''); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setShowBookSearch(true)}>
                        <BookOpen className="h-4 w-4" />
                        Search for a Book
                      </Button>
                    )}
                  </motion.div>
                ) : isTextType ? (
                  <motion.div key="text" className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Label>Content *</Label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your notes here..." rows={6} className="bg-background/50 resize-none" />
                  </motion.div>
                ) : isFileType ? (
                  <motion.div key="file" className="space-y-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Label>Upload File or Paste URL *</Label>
                    <div className="space-y-3">
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
                            <p className="text-sm text-muted-foreground">Click to upload {type === 'pdf' ? 'PDF' : 'file'}</p>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or paste URL</span></div>
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
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the resource" rows={2} className="bg-background/50 resize-none" />
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
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Add Resource'}
                </Button>
              </div>
            </form>
          </motion.div>
        </DialogContent>
      </Dialog>

      <BookSearchDialog
        open={showBookSearch}
        onOpenChange={setShowBookSearch}
        onSelect={handleBookSelect}
      />
    </>
  );
};