/**
 * GlobalSearchDialog
 * A command-palette style search dialog (⌘K) that searches all app features.
 * Selecting a result either navigates to the feature's view or opens a detail page.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { searchFeatures, featureRegistry, type FeatureItem } from '@/data/featureRegistry';
import { cn } from '@/lib/utils';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFeature: (feature: FeatureItem) => void;
}

const categoryColors: Record<string, string> = {
  core: 'bg-primary/10 text-primary border-primary/20',
  collaboration: 'bg-accent/50 text-accent-foreground border-accent/30',
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  utility: 'bg-muted text-muted-foreground border-border',
};

const categoryLabels: Record<string, string> = {
  core: 'Core',
  collaboration: 'Social',
  admin: 'Admin',
  utility: 'Utility',
};

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  open,
  onOpenChange,
  onSelectFeature,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = query.trim() ? searchFeatures(query) : featureRegistry.slice(0, 8);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selected index on results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (feature: FeatureItem) => {
      onSelectFeature(feature);
      onOpenChange(false);
    },
    [onSelectFeature, onOpenChange]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-border/40 shadow-2xl bg-card/98 backdrop-blur-2xl">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search features, tools, pages..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/50 bg-muted/40 rounded border border-border/30">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[360px]">
          <div className="p-2">
            {!query.trim() && (
              <div className="px-3 py-1.5 mb-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Popular features
                </span>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {results.length > 0 ? (
                results.map((feature, index) => {
                  const Icon = feature.icon;
                  const isSelected = index === selectedIndex;

                  return (
                    <motion.button
                      key={feature.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                      onClick={() => handleSelect(feature)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group',
                        isSelected
                          ? 'bg-primary/8 ring-1 ring-primary/15'
                          : 'hover:bg-secondary/50'
                      )}
                    >
                      <div
                        className={cn(
                          'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                          isSelected ? 'bg-primary/15' : 'bg-secondary/60'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4.5 w-4.5 transition-colors',
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {feature.label}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0 h-4 font-medium',
                              categoryColors[feature.category]
                            )}
                          >
                            {categoryLabels[feature.category]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {feature.description}
                        </p>
                      </div>

                      <ArrowRight
                        className={cn(
                          'h-4 w-4 shrink-0 transition-all',
                          isSelected
                            ? 'text-primary opacity-100 translate-x-0'
                            : 'text-muted-foreground/30 opacity-0 -translate-x-2'
                        )}
                      />
                    </motion.button>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No features found for "{query}"
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground/50">
          <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted/30 rounded text-[10px] border border-border/20">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted/30 rounded text-[10px] border border-border/20">↵</kbd>
              select
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
