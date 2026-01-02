import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, Upload, Link as LinkIcon, FileText, File, Type } from 'lucide-react';
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
import { Resource, RESOURCE_CATEGORIES } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface EditResourceModalProps {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (resource: Resource) => void;
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
  const [type, setType] = useState<Resource['type']>('pdf');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [chapter, setChapter] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isFileType = type === 'pdf' || type === 'document';
  const isLinkType = type === 'link' || type === 'video';
  const isTextType = type === 'text';

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setSubject(resource.subject);
      setType(resource.type);
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
    if (file) {
      setSelectedFile(file);
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
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateUrl = (urlString: string): boolean => {
    if (!urlString) return true;
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resource) return;

    if (!title || !subject || !description) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    if (isLinkType && url && !validateUrl(url)) {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: 'Please provide a valid URL starting with http:// or https://',
      });
      return;
    }

    const resourceUrl = selectedFile 
      ? URL.createObjectURL(selectedFile) 
      : url || resource.url;

    onSave({
      ...resource,
      title,
      subject,
      type,
      url: isTextType ? undefined : resourceUrl,
      fileName: selectedFile?.name || resource.fileName,
      fileSize: selectedFile?.size || resource.fileSize,
      description,
      content: isTextType ? content : undefined,
      category: category || undefined,
      chapter: chapter || undefined,
      tags: tags.length > 0 ? tags : undefined,
      updatedAt: new Date().toISOString(),
    });

    toast({
      title: 'Resource updated',
      description: 'Your resource has been updated successfully.',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Edit Resource
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Title */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter resource title"
                className="bg-background/50"
              />
            </motion.div>

            {/* Subject & Category Row */}
            <motion.div 
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Chapter/Unit */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
            >
              <Label htmlFor="edit-chapter">Chapter / Unit (optional)</Label>
              <Input
                id="edit-chapter"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g., Chapter 5: Thermodynamics"
                className="bg-background/50"
              />
            </motion.div>

            {/* Resource Type */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Label htmlFor="edit-type">Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as Resource['type'])}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Link / URL
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF File
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Document / File
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Video Link
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Text Note
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Dynamic input based on type */}
            <AnimatePresence mode="wait">
              {isTextType ? (
                <motion.div 
                  key="text-content"
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="edit-content">Content *</Label>
                  <Textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your notes here..."
                    rows={6}
                    className="bg-background/50 resize-none"
                  />
                </motion.div>
              ) : isFileType ? (
                <motion.div 
                  key="file-upload"
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label>Upload New File or Update URL</Label>
                  <div className="space-y-3">
                    {/* Current file info */}
                    {(resource?.fileName || resource?.url) && !selectedFile && (
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm truncate">
                          {resource.fileName || 'Current file'}
                        </span>
                      </div>
                    )}
                    
                    {/* File upload area */}
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={type === 'pdf' ? '.pdf' : '*'}
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="text-left">
                            <p className="font-medium text-sm">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-2 h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload new {type === 'pdf' ? 'PDF' : 'file'}
                          </p>
                        </>
                      )}
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or update URL</span>
                      </div>
                    </div>

                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/file.pdf"
                        className="pl-9 bg-background/50"
                        disabled={!!selectedFile}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : isLinkType ? (
                <motion.div 
                  key="url-input"
                  className="space-y-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="edit-url">URL *</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="pl-9 bg-background/50"
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Description */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the resource"
                rows={2}
                className="bg-background/50 resize-none"
              />
            </motion.div>

            {/* Tags */}
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
            >
              <Label>Tags (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyPress}
                  placeholder="Add a tag and press Enter"
                  className="bg-background/50"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Buttons */}
            <motion.div 
              className="flex gap-2 pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};