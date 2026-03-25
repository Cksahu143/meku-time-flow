import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Loader2, Check, X, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface BookResult {
  title: string;
  author: string;
  coverUrl: string | null;
  description: string;
  publishYear: string;
  sourceUrl: string;
  source: 'openlibrary' | 'google' | 'ai';
  language?: string;
  chapters?: string[];
}

interface BookSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (book: BookResult) => void;
}

const PLACEHOLDER_COVER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="180" fill="%23666"%3E%3Crect width="128" height="180" fill="%23f0f0f0"/%3E%3Ctext x="64" y="95" text-anchor="middle" font-size="14" fill="%23999"%3E📖%3C/text%3E%3C/svg%3E';

const LANGUAGES = [
  { code: '', label: 'All Languages' },
  { code: 'eng', label: 'English' },
  { code: 'hin', label: 'Hindi (हिन्दी)' },
  { code: 'san', label: 'Sanskrit (संस्कृत)' },
  { code: 'ori', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'ben', label: 'Bengali (বাংলা)' },
  { code: 'tam', label: 'Tamil (தமிழ்)' },
  { code: 'tel', label: 'Telugu (తెలుగు)' },
  { code: 'mar', label: 'Marathi (मराठी)' },
  { code: 'guj', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kan', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'mal', label: 'Malayalam (മലയാളം)' },
  { code: 'pan', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'urd', label: 'Urdu (اردو)' },
  { code: 'fre', label: 'French' },
  { code: 'ger', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'chi', label: 'Chinese' },
  { code: 'ara', label: 'Arabic' },
  { code: 'rus', label: 'Russian' },
];

// Google Books language codes differ from Open Library
const OL_TO_GOOGLE_LANG: Record<string, string> = {
  eng: 'en', hin: 'hi', san: 'sa', ori: 'or', ben: 'bn', tam: 'ta', tel: 'te',
  mar: 'mr', guj: 'gu', kan: 'kn', mal: 'ml', pan: 'pa', urd: 'ur',
  fre: 'fr', ger: 'de', spa: 'es', jpn: 'ja', chi: 'zh', ara: 'ar', rus: 'ru',
};

export const BookSearchDialog: React.FC<BookSearchDialogProps> = ({ open, onOpenChange, onSelect }) => {
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BookResult[]>([]);
  const [selected, setSelected] = useState<BookResult | null>(null);
  const [fetchingChapters, setFetchingChapters] = useState<string | null>(null);

  const searchBooks = async () => {
    if (!bookTitle.trim()) { toast.error('Enter a book title'); return; }
    setSearching(true);
    setResults([]);
    setSelected(null);

    try {
      const [openLibResults, googleResults] = await Promise.all([
        searchOpenLibrary(bookTitle, author, language),
        searchGoogleBooks(bookTitle, author, language),
      ]);
      const merged = deduplicateAndMerge(openLibResults, googleResults);
      setResults(merged.slice(0, 15));
    } catch (e) {
      console.error('Search error:', e);
      toast.error('Search failed. Please try again.');
    }
    setSearching(false);
  };

  const searchOpenLibrary = async (title: string, authorName: string, lang: string): Promise<BookResult[]> => {
    try {
      let url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=12`;
      if (authorName) url += `&author=${encodeURIComponent(authorName)}`;
      if (lang) url += `&language=${lang}`;
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
        language: doc.language?.[0] || lang || '',
      }));
    } catch { return []; }
  };

  const searchGoogleBooks = async (title: string, authorName: string, lang: string): Promise<BookResult[]> => {
    try {
      let q = `intitle:${title}`;
      if (authorName) q += `+inauthor:${authorName}`;
      let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12`;
      if (lang && OL_TO_GOOGLE_LANG[lang]) url += `&langRestrict=${OL_TO_GOOGLE_LANG[lang]}`;
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data.items || []).map((item: any) => {
        const v = item.volumeInfo || {};
        return {
          title: v.title || '',
          author: v.authors?.[0] || 'Unknown',
          coverUrl: v.imageLinks?.thumbnail?.replace('http:', 'https:') || v.imageLinks?.smallThumbnail?.replace('http:', 'https:') || null,
          description: v.description?.slice(0, 300) || '',
          publishYear: v.publishedDate?.split('-')[0] || '',
          sourceUrl: v.infoLink || '',
          source: 'google' as const,
          language: v.language || lang || '',
          // Try to extract table of contents if available
          chapters: extractChaptersFromDescription(v.description || ''),
        };
      });
    } catch { return []; }
  };

  const extractChaptersFromDescription = (desc: string): string[] => {
    if (!desc) return [];
    // Look for chapter-like patterns in descriptions
    const chapters: string[] = [];
    const patterns = [
      /(?:chapter|canto|adhyaya|sarga|parva|skandha|book)\s*[\d]+[:\s-]*.+/gi,
      /(?:part|section|unit|lesson)\s*[\d]+[:\s-]*.+/gi,
    ];
    for (const pat of patterns) {
      let m;
      while ((m = pat.exec(desc)) !== null && chapters.length < 30) {
        chapters.push(m[0].trim());
      }
    }
    return chapters;
  };

  const fetchBookChapters = async (book: BookResult): Promise<string[]> => {
    // Try Open Library for table of contents
    if (book.sourceUrl.includes('openlibrary.org')) {
      try {
        const key = book.sourceUrl.replace('https://openlibrary.org', '');
        const resp = await fetch(`https://openlibrary.org${key}.json`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.table_of_contents && Array.isArray(data.table_of_contents)) {
            return data.table_of_contents.map((c: any) =>
              typeof c === 'string' ? c : c.title || c.label || `${c.level || ''} ${c.value || ''}`.trim()
            ).filter(Boolean);
          }
          // Check for subjects as fallback chapter-like info
          if (data.subjects && Array.isArray(data.subjects)) {
            return data.subjects.slice(0, 20);
          }
        }
      } catch {}
    }

    // Try Google Books for table of contents
    if (book.sourceUrl.includes('google')) {
      try {
        const idMatch = book.sourceUrl.match(/id=([^&]+)/);
        if (idMatch) {
          const resp = await fetch(`https://www.googleapis.com/books/v1/volumes/${idMatch[1]}`);
          if (resp.ok) {
            const data = await resp.json();
            const desc = data.volumeInfo?.description || '';
            const toc = extractChaptersFromDescription(desc);
            if (toc.length > 0) return toc;
            // Fallback: categories
            if (data.volumeInfo?.categories) {
              return data.volumeInfo.categories;
            }
          }
        }
      } catch {}
    }

    return book.chapters || [];
  };

  const deduplicateAndMerge = (ol: BookResult[], gb: BookResult[]): BookResult[] => {
    const seen = new Map<string, BookResult>();
    for (const b of gb) {
      const key = `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
      seen.set(key, b);
    }
    for (const b of ol) {
      const key = `${b.title.toLowerCase()}|${b.author.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, b);
      } else {
        const existing = seen.get(key)!;
        if (!existing.coverUrl && b.coverUrl) existing.coverUrl = b.coverUrl;
        if (!existing.description && b.description) existing.description = b.description;
      }
    }
    const all = Array.from(seen.values());
    const titleLower = bookTitle.toLowerCase();
    all.sort((a, b) => {
      const aExact = a.title.toLowerCase() === titleLower ? 0 : 1;
      const bExact = b.title.toLowerCase() === titleLower ? 0 : 1;
      return aExact - bExact;
    });
    return all;
  };

  const handleSelect = async (book: BookResult) => {
    setSelected(book);
    // Fetch chapters if not already present
    if (!book.chapters || book.chapters.length === 0) {
      setFetchingChapters(book.title);
      const chapters = await fetchBookChapters(book);
      book.chapters = chapters;
      setSelected({ ...book, chapters });
      setFetchingChapters(null);
    }
  };

  const confirmSelection = () => {
    if (selected) {
      onSelect(selected);
      onOpenChange(false);
    }
  };

  const langLabel = LANGUAGES.find(l => l.code === language)?.label || 'All Languages';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setResults([]); setSelected(null); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Search Books
          </DialogTitle>
        </DialogHeader>

        {/* Search inputs */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-xs">Book Title *</Label>
            <Input value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="e.g. Srimad Bhagavatam, Fundamentals of Physics" onKeyDown={e => e.key === 'Enter' && searchBooks()} />
          </div>
          <div className="w-36 space-y-1">
            <Label className="text-xs">Author</Label>
            <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Optional" onKeyDown={e => e.key === 'Enter' && searchBooks()} />
          </div>
          <div className="w-40 space-y-1">
            <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Languages" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => (
                  <SelectItem key={l.code} value={l.code || 'all'}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={searchBooks} disabled={searching} className="gap-1.5 shrink-0">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {/* Selected badge */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <span className="text-sm">📖 <strong>{selected.title}</strong> by {selected.author}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSelected(null)}>
                  <X className="h-3 w-3" />
                </Button>
                <Button size="sm" onClick={confirmSelection} className="gap-1">
                  <Check className="h-3 w-3" /> Confirm
                </Button>
              </div>
              {fetchingChapters && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Fetching table of contents...
                </div>
              )}
              {selected.chapters && selected.chapters.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Chapters/Sections found:</span>{' '}
                  {selected.chapters.slice(0, 5).join(', ')}
                  {selected.chapters.length > 5 && ` (+${selected.chapters.length - 5} more)`}
                </div>
              )}
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
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleSelect(book)}
                  className={`relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md group ${
                    selected?.title === book.title && selected?.author === book.author
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border/50 hover:border-primary/30'
                  }`}
                >
                  <div className="absolute top-2 right-2 flex gap-1">
                    {book.publishYear && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{book.publishYear}</Badge>
                    )}
                    {book.language && book.language !== 'all' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{book.language}</Badge>
                    )}
                  </div>
                  {selected?.title === book.title && selected?.author === book.author && (
                    <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="w-full h-36 mb-2 rounded overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={book.coverUrl || PLACEHOLDER_COVER}
                      alt={book.title}
                      className="h-full object-contain"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                    />
                  </div>
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
              <p className="text-sm text-muted-foreground">No results found. Try different search terms or language.</p>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
