import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Loader2, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface BookResult {
  title: string;
  author: string;
  coverUrl: string | null;
  description: string;
  publishYear: string;
  sourceUrl: string;
  source: 'openlibrary' | 'google' | 'ai';
}

interface BookSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (book: BookResult) => void;
}

const PLACEHOLDER_COVER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="180" fill="%23666"%3E%3Crect width="128" height="180" fill="%23f0f0f0"/%3E%3Ctext x="64" y="95" text-anchor="middle" font-size="14" fill="%23999"%3E📖%3C/text%3E%3C/svg%3E';

export const BookSearchDialog: React.FC<BookSearchDialogProps> = ({ open, onOpenChange, onSelect }) => {
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BookResult[]>([]);
  const [selected, setSelected] = useState<BookResult | null>(null);

  const searchBooks = async () => {
    if (!bookTitle.trim()) { toast.error('Enter a book title'); return; }
    setSearching(true);
    setResults([]);
    setSelected(null);

    try {
      const [openLibResults, googleResults] = await Promise.all([
        searchOpenLibrary(bookTitle, author),
        searchGoogleBooks(bookTitle, author),
      ]);

      const merged = deduplicateAndMerge(openLibResults, googleResults);
      setResults(merged.slice(0, 12));
    } catch (e) {
      console.error('Search error:', e);
      toast.error('Search failed. Please try again.');
    }
    setSearching(false);
  };

  const searchOpenLibrary = async (title: string, authorName: string): Promise<BookResult[]> => {
    try {
      let url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=10`;
      if (authorName) url += `&author=${encodeURIComponent(authorName)}`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.docs || []).map((doc: any) => ({
        title: doc.title || '',
        author: doc.author_name?.[0] || 'Unknown',
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
        description: '',
        publishYear: doc.first_publish_year?.toString() || '',
        sourceUrl: `https://openlibrary.org${doc.key}`,
        source: 'openlibrary' as const,
      }));
    } catch { return []; }
  };

  const searchGoogleBooks = async (title: string, authorName: string): Promise<BookResult[]> => {
    try {
      let q = `intitle:${title}`;
      if (authorName) q += `+inauthor:${authorName}`;
      const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.items || []).map((item: any) => {
        const v = item.volumeInfo || {};
        return {
          title: v.title || '',
          author: v.authors?.[0] || 'Unknown',
          coverUrl: v.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
          description: v.description?.slice(0, 300) || '',
          publishYear: v.publishedDate?.split('-')[0] || '',
          sourceUrl: v.infoLink || '',
          source: 'google' as const,
        };
      });
    } catch { return []; }
  };

  const deduplicateAndMerge = (ol: BookResult[], gb: BookResult[]): BookResult[] => {
    const seen = new Map<string, BookResult>();
    // Google first (richer metadata)
    for (const b of gb) {
      const key = `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
      seen.set(key, b);
    }
    for (const b of ol) {
      const key = `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, b);
      } else {
        // Merge cover if missing
        const existing = seen.get(key)!;
        if (!existing.coverUrl && b.coverUrl) existing.coverUrl = b.coverUrl;
      }
    }
    const all = Array.from(seen.values());
    // Sort: exact match first
    const titleLower = bookTitle.toLowerCase();
    all.sort((a, b) => {
      const aExact = a.title.toLowerCase() === titleLower ? 0 : 1;
      const bExact = b.title.toLowerCase() === titleLower ? 0 : 1;
      return aExact - bExact;
    });
    return all;
  };

  const handleSelect = (book: BookResult) => {
    setSelected(book);
  };

  const confirmSelection = () => {
    if (selected) {
      onSelect(selected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setResults([]); setSelected(null); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Search Books
          </DialogTitle>
        </DialogHeader>

        {/* Search inputs */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Book Title *</Label>
            <Input value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="e.g. Fundamentals of Physics" onKeyDown={e => e.key === 'Enter' && searchBooks()} />
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs">Author</Label>
            <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Optional" onKeyDown={e => e.key === 'Enter' && searchBooks()} />
          </div>
          <Button onClick={searchBooks} disabled={searching} className="gap-1.5 shrink-0">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {/* Selected badge */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm">📖 <strong>{selected.title}</strong> by {selected.author} selected</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSelected(null)}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={confirmSelection} className="gap-1">
                <Check className="h-3 w-3" /> Confirm
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results grid */}
        <ScrollArea className="flex-1 min-h-0">
          {searching ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2 p-3 rounded-lg border border-border/50">
                  <Skeleton className="w-full h-36 rounded" />
                  <Skeleton className="w-3/4 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-1">
              {results.map((book, i) => (
                <motion.div
                  key={`${book.title}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleSelect(book)}
                  className={`relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md group ${
                    selected?.title === book.title && selected?.author === book.author
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border/50 hover:border-primary/30'
                  }`}
                >
                  {/* Year badge */}
                  {book.publishYear && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] px-1.5 py-0">
                      {book.publishYear}
                    </Badge>
                  )}
                  {/* Selection checkmark */}
                  {selected?.title === book.title && selected?.author === book.author && (
                    <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {/* Cover */}
                  <div className="w-full h-36 mb-2 rounded overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={book.coverUrl || PLACEHOLDER_COVER}
                      alt={book.title}
                      className="h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                    />
                  </div>
                  {/* Info */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{book.title}</p>
                    </TooltipTrigger>
                    {book.description && (
                      <TooltipContent className="max-w-xs text-xs">{book.description.slice(0, 200)}</TooltipContent>
                    )}
                  </Tooltip>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                </motion.div>
              ))}
            </div>
          ) : !searching && bookTitle ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No results found. Try different search terms.</p>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
