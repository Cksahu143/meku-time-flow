import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Send, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SavedAIResult } from '@/hooks/useSavedAIResults';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://gkkeysrfmgmxoypnjkdl.supabase.co`;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-study-tools`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedResult: SavedAIResult;
  onUpdated?: () => void;
}

export const SavedCoCoChatDialog = ({ open, onOpenChange, savedResult, onUpdated }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initialized = useRef(false);

  // Load saved messages on open
  useEffect(() => {
    if (open && savedResult?.ai_output?.messages && !initialized.current) {
      setMessages(savedResult.ai_output.messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })));
      initialized.current = true;
    }
    if (!open) {
      initialized.current = false;
    }
  }, [open, savedResult]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantSoFar = '';

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > allMessages.length) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'chat',
          content: savedResult.input_context || '',
          title: savedResult.resource_title || 'Continued Chat',
          subject: savedResult.subject,
          messages: allMessages.filter((_, i) => i > 0 || allMessages[0].role === 'user')
            .map(m => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Request failed' }));
        toast.error(err.error || 'Failed to get response');
        setIsLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { buf = line + '\n' + buf; break; }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error(e);
        toast.error('Failed to connect to CoCo');
      }
    }
    setIsLoading(false);
  };

  const updateSavedChat = async () => {
    if (messages.length < 2) return;
    setSaving(true);
    try {
      const chatOutput = { messages: messages.map(m => ({ role: m.role, content: m.content })) };
      const { error } = await (supabase.from('saved_ai_results' as any) as any)
        .update({ ai_output: chatOutput })
        .eq('id', savedResult.id);
      if (error) { toast.error('Failed to update'); console.error(error); }
      else { toast.success('Chat updated!'); onUpdated?.(); }
    } catch { toast.error('Failed to update'); }
    setSaving(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      abortRef.current?.abort();
      setMessages([]);
      setInput('');
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0" onInteractOutside={e => e.preventDefault()} onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate flex-1">Continue — {savedResult.resource_title || 'CoCo Chat'}</span>
            <Button variant="outline" size="sm" className="gap-1.5 ml-auto shrink-0" onClick={updateSavedChat} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Update Chat'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="px-6 pb-6 pt-3 border-t border-border/40">
          <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Continue your conversation with CoCo..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
