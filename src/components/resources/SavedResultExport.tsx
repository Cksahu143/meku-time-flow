import React from 'react';
import { Download, FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SavedAIResult } from '@/hooks/useSavedAIResults';
import { toast } from 'sonner';

function resultToText(result: SavedAIResult): string {
  const lines: string[] = [];
  const title = result.resource_title || result.input_context || 'Untitled';
  lines.push(`=== ${title} ===`);
  lines.push(`Tool: ${result.tool_type}`);
  lines.push(`Subject: ${result.subject}`);
  lines.push(`Date: ${new Date(result.created_at).toLocaleString()}`);
  lines.push('');

  const output = result.ai_output;

  if (result.tool_type === 'flashcards' && output?.flashcards) {
    output.flashcards.forEach((c: any, i: number) => {
      lines.push(`Card ${i + 1}:`);
      lines.push(`  Q: ${c.front}`);
      lines.push(`  A: ${c.back}`);
      lines.push('');
    });
  } else if (result.tool_type === 'quiz' && output?.questions) {
    output.questions.forEach((q: any, i: number) => {
      lines.push(`${i + 1}. ${q.question}`);
      q.options?.forEach((opt: string, oi: number) => {
        const marker = oi === q.correctIndex ? ' ✓' : '';
        lines.push(`   ${String.fromCharCode(65 + oi)}. ${opt}${marker}`);
      });
      if (q.explanation) lines.push(`   Explanation: ${q.explanation}`);
      lines.push('');
    });
  } else if (result.tool_type === 'slides' && output?.slides) {
    output.slides.forEach((s: any, i: number) => {
      lines.push(`Slide ${i + 1}: ${s.title}`);
      s.bullets?.forEach((b: string) => lines.push(`  • ${b}`));
      lines.push('');
    });
  } else if (result.tool_type === 'report' && output) {
    lines.push(`Score: ${output.overallScore}% (${output.overallGrade})`);
    lines.push(output.summary || '');
  } else if (result.tool_type === 'coco_chat' && output?.messages) {
    output.messages.forEach((m: any) => {
      lines.push(`${m.role === 'user' ? 'You' : 'CoCo'}: ${m.content}`);
      lines.push('');
    });
  } else if ((result.tool_type === 'podcast' || result.tool_type === 'audio_overview') && output?.text) {
    lines.push(output.text);
  } else if (result.tool_type === 'mindmap' && output?.centralTopic) {
    lines.push(`Central Topic: ${output.centralTopic}`);
    output.nodes?.forEach((n: any) => lines.push(`  - ${n.label}`));
  } else if (typeof output === 'string') {
    lines.push(output);
  } else {
    lines.push(JSON.stringify(output, null, 2));
  }

  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateHTML(result: SavedAIResult): string {
  const text = resultToText(result);
  const title = result.resource_title || result.input_context || 'Saved Result';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#1a1a1a;line-height:1.6}
h1{font-size:1.5em;border-bottom:2px solid #3b82f6;padding-bottom:8px}
.meta{color:#6b7280;font-size:0.9em;margin-bottom:24px}
pre{white-space:pre-wrap;background:#f3f4f6;padding:16px;border-radius:8px;font-size:0.9em}
</style></head><body>
<h1>${title}</h1>
<div class="meta">${result.tool_type} · ${result.subject} · ${new Date(result.created_at).toLocaleDateString()}</div>
<pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body></html>`;
}

interface SavedResultExportProps {
  result: SavedAIResult;
}

export const SavedResultExport: React.FC<SavedResultExportProps> = ({ result }) => {
  const baseName = (result.resource_title || result.tool_type).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);

  const exportText = () => {
    downloadFile(resultToText(result), `${baseName}.txt`, 'text/plain');
    toast.success('Downloaded as text');
  };

  const exportPDF = () => {
    // Use print-to-PDF via a new window with styled HTML
    const html = generateHTML(result);
    const win = window.open('', '_blank');
    if (!win) { toast.error('Please allow popups'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
    toast.success('Print dialog opened — save as PDF');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportText} className="gap-2">
          <FileText className="h-4 w-4" /> Download as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF} className="gap-2">
          <FileDown className="h-4 w-4" /> Save as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
