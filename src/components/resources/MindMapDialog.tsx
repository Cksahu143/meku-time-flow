import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronRight, ChevronDown, Plus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

interface MindMapData {
  centralTopic: string;
  nodes: MindMapNode[];
}

interface MindMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
  fileName?: string;
}

const BRANCH_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 55%)',
  'hsl(160, 60%, 45%)',
  'hsl(30, 80%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 65%, 55%)',
  'hsl(190, 70%, 45%)',
  'hsl(45, 80%, 50%)',
];

const NodeItem = ({
  node,
  depth = 0,
  color,
  onExtend,
  extending,
}: {
  node: MindMapNode;
  depth?: number;
  color: string;
  onExtend: (nodeId: string, label: string) => void;
  extending: string | null;
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-1 group">
        {/* Connector line */}
        {depth > 0 && (
          <div
            className="absolute left-0 top-1/2 w-4 h-px"
            style={{ backgroundColor: color, opacity: 0.4 }}
          />
        )}

        {/* Toggle button */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-[18px] shrink-0" />
        )}

        {/* Node pill */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: depth * 0.05 }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm cursor-default transition-all hover:shadow-sm"
          style={{
            borderColor: color,
            backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
          }}
        >
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium whitespace-nowrap">{node.label}</span>
        </motion.div>

        {/* Extend button */}
        <button
          onClick={() => onExtend(node.id, node.label)}
          disabled={extending !== null}
          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-full hover:bg-muted/50 transition-all"
          title="Extend this branch"
        >
          {extending === node.id ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <Plus className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-6 mt-1 space-y-1 relative overflow-hidden"
          >
            {/* Vertical connector */}
            <div
              className="absolute left-[9px] top-0 bottom-0 w-px"
              style={{ backgroundColor: color, opacity: 0.2 }}
            />
            {node.children!.map((child) => (
              <NodeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                color={color}
                onExtend={onExtend}
                extending={extending}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MindMapDialog = ({ open, onOpenChange, resource, content, gradeLevel, fileName }: MindMapDialogProps) => {
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (open) {
      setMindMap(null);
      setScale(1);
    }
  }, [open]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-study-tools', {
        body: {
          type: 'mindmap',
          content,
          title: resource.title,
          subject: resource.subject,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          fileName: fileName || resource.file_name,
          gradeLevel,
        },
      });
      if (error) throw error;
      if (data?.centralTopic && data?.nodes) {
        setMindMap(data);
      } else {
        throw new Error('No mind map generated');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate mind map');
    }
    setLoading(false);
  };

  const findAndAddChildren = (nodes: MindMapNode[], targetId: string, newChildren: MindMapNode[]): MindMapNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return {
          ...node,
          children: [...(node.children || []), ...newChildren],
        };
      }
      if (node.children) {
        return { ...node, children: findAndAddChildren(node.children, targetId, newChildren) };
      }
      return node;
    });
  };

  const handleExtend = useCallback(async (nodeId: string, nodeLabel: string) => {
    if (!mindMap) return;
    setExtending(nodeId);
    try {
      const { data, error } = await supabase.functions.invoke('ai-study-tools', {
        body: {
          type: 'mindmap',
          content: `${content}\n\nFOCUS: Expand specifically on the subtopic "${nodeLabel}" within the context of "${mindMap.centralTopic}". The parent topic is "${resource.title}" in ${resource.subject}.`,
          title: nodeLabel,
          subject: resource.subject,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          fileName: fileName || resource.file_name,
          gradeLevel,
        },
      });
      if (error) throw error;
      if (data?.nodes) {
        // Add the generated nodes as children of the target node
        setMindMap(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            nodes: findAndAddChildren(prev.nodes, nodeId, data.nodes),
          };
        });
        toast.success(`Extended "${nodeLabel}" with ${data.nodes.length} branches`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to extend branch');
    }
    setExtending(null);
  }, [mindMap, content, resource, fileName, gradeLevel]);

  const handleClose = (v: boolean) => {
    if (!v) setMindMap(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-3xl max-h-[85vh]"
        onInteractOutside={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Mind Map — {resource.title}
          </DialogTitle>
        </DialogHeader>

        {!mindMap && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-center max-w-md">
              <h4 className="font-semibold text-sm mb-1">🧠 AI Mind Map</h4>
              <p className="text-sm text-muted-foreground">
                Generates a visual mind map of key concepts from this resource. Hover over any node and click + to expand it with more detail.
              </p>
            </div>
            <Button onClick={generate} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate Mind Map
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Building mind map...</p>
          </div>
        ) : mindMap ? (
          <div className="space-y-3">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.6, s - 0.1))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Badge variant="outline" className="text-xs">{Math.round(scale * 100)}%</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(1.5, s + 0.1))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button onClick={generate} variant="outline" size="sm" className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Regenerate
              </Button>
            </div>

            <ScrollArea className="h-[55vh]">
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} className="pb-8 pr-8">
                {/* Central topic */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-md mb-4"
                >
                  🧠 {mindMap.centralTopic}
                </motion.div>

                {/* Branches */}
                <div className="ml-4 space-y-2">
                  {mindMap.nodes.map((node, i) => (
                    <NodeItem
                      key={node.id}
                      node={node}
                      depth={0}
                      color={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                      onExtend={handleExtend}
                      extending={extending}
                    />
                  ))}
                </div>
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground text-center">
              Hover over any node and click <Plus className="h-3 w-3 inline" /> to expand it with AI
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
