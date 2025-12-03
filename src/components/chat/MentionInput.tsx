import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  groupMembers?: string[];
}

export interface MentionInputRef {
  focus: () => void;
}

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(({
  value,
  onChange,
  onKeyPress,
  placeholder,
  className,
  groupMembers = []
}, ref) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus()
  }));

  useEffect(() => {
    const match = value.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowSuggestions(true);
      fetchSuggestions(match[1]);
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  const fetchSuggestions = async (query: string) => {
    let queryBuilder = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url');

    if (groupMembers.length > 0) {
      queryBuilder = queryBuilder.in('id', groupMembers);
    }

    if (query) {
      queryBuilder = queryBuilder.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
    }

    const { data } = await queryBuilder.limit(5);
    setSuggestions(data || []);
    setSelectedIndex(0);
  };

  const handleSelectUser = (user: User) => {
    const name = user.username || user.display_name || 'user';
    const newValue = value.replace(/@\w*$/, `@${name} `);
    onChange(newValue);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault();
      handleSelectUser(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={onKeyPress}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('transition-all focus:scale-[1.01]', className)}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg overflow-hidden animate-scale-in z-50">
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={cn(
                'w-full px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors',
                index === selectedIndex && 'bg-muted'
              )}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {(user.display_name || user.username || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <span className="text-sm font-medium">
                  {user.display_name || user.username || 'Anonymous'}
                </span>
                {user.username && (
                  <span className="text-xs text-muted-foreground ml-2">@{user.username}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

MentionInput.displayName = 'MentionInput';
