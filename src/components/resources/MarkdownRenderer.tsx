import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
        integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rl+YeQjqlOHtGn3MkfDCJIQ"
        crossOrigin="anonymous"
      />
      <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            table: ({ children }) => (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse border border-border text-sm">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold text-foreground">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-3 py-2 text-foreground">
                {children}
              </td>
            ),
            code: ({ className: codeClassName, children, ...props }) => {
              const match = /language-(\w+)/.exec(codeClassName || '');
              const isInline = !match;
              if (isInline) {
                return (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <pre className="bg-muted/80 rounded-lg p-4 overflow-x-auto my-3 border border-border/50">
                  <code className={`text-xs font-mono ${codeClassName}`} {...props}>
                    {children}
                  </code>
                </pre>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary/50 bg-primary/5 pl-4 py-2 my-3 italic text-muted-foreground">
                {children}
              </blockquote>
            ),
            h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mt-6 mb-3">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold text-foreground mt-5 mb-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>,
            strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 my-3">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 my-3">{children}</ol>,
            li: ({ children }) => <li className="text-foreground leading-relaxed">{children}</li>,
            p: ({ children }) => <p className="my-2.5 text-foreground leading-relaxed">{children}</p>,
            a: ({ href, children }) => {
              // Detect YouTube links
              const ytMatch = href?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]+)/);
              if (ytMatch) {
                return (
                  <div className="my-4 rounded-lg overflow-hidden border border-border/50">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytMatch[1]}`}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube video"
                    />
                  </div>
                );
              }
              // Detect Vimeo links
              const vimeoMatch = href?.match(/(?:vimeo\.com\/)(\d+)/);
              if (vimeoMatch) {
                return (
                  <div className="my-4 rounded-lg overflow-hidden border border-border/50">
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1`}
                      className="w-full aspect-video"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title="Vimeo video"
                    />
                  </div>
                );
              }
              // Detect Dailymotion links
              const dmMatch = href?.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([\w]+)/);
              if (dmMatch) {
                return (
                  <div className="my-4 rounded-lg overflow-hidden border border-border/50">
                    <iframe
                      src={`https://www.dailymotion.com/embed/video/${dmMatch[1]}`}
                      className="w-full aspect-video"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title="Dailymotion video"
                    />
                  </div>
                );
              }
              // Detect Loom links
              const loomMatch = href?.match(/(?:loom\.com\/share\/)([\w]+)/);
              if (loomMatch) {
                return (
                  <div className="my-4 rounded-lg overflow-hidden border border-border/50">
                    <iframe
                      src={`https://www.loom.com/embed/${loomMatch[1]}`}
                      className="w-full aspect-video"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      title="Loom video"
                    />
                  </div>
                );
              }
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                  {children}
                </a>
              );
            },
            img: ({ src, alt }) => {
              // Detect video file extensions
              if (src && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(src)) {
                return (
                  <div className="my-4 rounded-lg overflow-hidden border border-border/50">
                    <video src={src} controls className="w-full max-h-[500px]" playsInline>
                      Your browser does not support the video tag.
                    </video>
                  </div>
                );
              }
              return (
                <img src={src} alt={alt || ''} className="rounded-lg my-3 max-w-full h-auto border border-border/50" loading="lazy" />
              );
            },
            hr: () => <hr className="my-6 border-border/50" />,
          }}
        />
      </div>
    </>
  );
};
