import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SubjectComboboxProps {
  value: string;
  onChange: (value: string) => void;
  subjects: string[];
  className?: string;
}

export const SubjectCombobox: React.FC<SubjectComboboxProps> = ({
  value,
  onChange,
  subjects,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = subjects.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  const isCustom = search.trim() && !subjects.some(
    (s) => s.toLowerCase() === search.trim().toLowerCase()
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          {value || 'Select subject'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="start">
        <Input
          ref={inputRef}
          placeholder="Search or type new..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && search.trim()) {
              e.preventDefault();
              handleSelect(search.trim());
            }
          }}
        />
        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
          {filtered.map((s) => (
            <button
              key={s}
              onClick={() => handleSelect(s)}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left',
                value === s && 'bg-accent'
              )}
            >
              <Check className={cn('h-3.5 w-3.5', value === s ? 'opacity-100' : 'opacity-0')} />
              {s}
            </button>
          ))}
          {isCustom && (
            <button
              onClick={() => handleSelect(search.trim())}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left text-primary font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add "{search.trim()}"
            </button>
          )}
          {filtered.length === 0 && !isCustom && (
            <p className="text-xs text-muted-foreground text-center py-2">No subjects found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
