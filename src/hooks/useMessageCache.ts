import { useState, useEffect } from 'react';
import { Message } from '@/types';

interface CacheEntry {
  messages: Message[];
  timestamp: number;
  profiles: Record<string, any>;
}

const CACHE_KEY_PREFIX = 'chat_cache_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const useMessageCache = (groupId: string | null) => {
  const getCacheKey = () => `${CACHE_KEY_PREFIX}${groupId}`;

  const getCachedData = (): CacheEntry | null => {
    if (!groupId) return null;

    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;

      const data = JSON.parse(cached) as CacheEntry;
      const isExpired = Date.now() - data.timestamp > CACHE_EXPIRY;

      if (isExpired) {
        localStorage.removeItem(getCacheKey());
        return null;
      }

      return data;
    } catch {
      return null;
    }
  };

  const setCachedData = (messages: Message[], profiles: Record<string, any>) => {
    if (!groupId) return;

    try {
      const data: CacheEntry = {
        messages,
        profiles,
        timestamp: Date.now(),
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(data));
    } catch (error) {
      // Handle quota exceeded
      console.error('Failed to cache messages:', error);
    }
  };

  const clearCache = () => {
    if (!groupId) return;
    localStorage.removeItem(getCacheKey());
  };

  // Clean up old cache entries periodically
  useEffect(() => {
    const cleanupCache = () => {
      try {
        const keys = Object.keys(localStorage);
        const now = Date.now();

        keys.forEach((key) => {
          if (key.startsWith(CACHE_KEY_PREFIX)) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '');
              if (now - data.timestamp > CACHE_EXPIRY) {
                localStorage.removeItem(key);
              }
            } catch {
              localStorage.removeItem(key);
            }
          }
        });
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    };

    cleanupCache();
    const interval = setInterval(cleanupCache, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  return {
    getCachedData,
    setCachedData,
    clearCache,
  };
};
