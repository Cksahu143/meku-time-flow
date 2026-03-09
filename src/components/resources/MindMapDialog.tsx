import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Plus, RotateCcw, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DbResource } from '@/hooks/useResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MindMapNode {
  id: string;
  label: string;
  description?: string;
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

// NotebookLM-style color palette
const BRANCH_COLORS = [
  '#4285F4', // Google Blue
  '#EA4335', // Google Red
  '#34A853', // Google Green
  '#FBBC04', // Google Yellow
  '#9334E6', // Purple
  '#E67C73', // Salmon
  '#00ACC1', // Teal
  '#F4511E', // Deep Orange
];

interface LayoutNode {
  node: MindMapNode;
  x: number;
  y: number;
  color: string;
  depth: number;
  parentX?: number;
  parentY?: number;
  branchIndex: number;
  angle: number;
}

function layoutTree(data: MindMapData, centerX: number, centerY: number): LayoutNode[] {
  const result: LayoutNode[] = [];
  const mainNodes = data.nodes;
  const count = mainNodes.length;

  mainNodes.forEach((node, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const radius = 220;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];

    result.push({ node, x, y, color, depth: 1, parentX: centerX, parentY: centerY, branchIndex: i, angle });

    if (node.children) {
      const childSpread = Math.min(0.6, Math.PI / Math.max(count, 4));
      node.children.forEach((child, ci) => {
        const childCount = node.children!.length;
        const childAngle = angle + (ci - (childCount - 1) / 2) * (childSpread / Math.max(childCount - 1, 1));
        const childRadius = 150;
        const cx = x + Math.cos(childAngle) * childRadius;
        const cy = y + Math.sin(childAngle) * childRadius;

        result.push({ node: child, x: cx, y: cy, color, depth: 2, parentX: x, parentY: y, branchIndex: i, angle: childAngle });

        if (child.children) {
          child.children.forEach((grandchild, gi) => {
            const gcCount = child.children!.length;
            const gcAngle = childAngle + (gi - (gcCount - 1) / 2) * (0.3 / Math.max(gcCount - 1, 1));
            const gcRadius = 120;
            const gx = cx + Math.cos(gcAngle) * gcRadius;
            const gy = cy + Math.sin(gcAngle) * gcRadius;
            result.push({ node: grandchild, x: gx, y: gy, color, depth: 3, parentX: cx, parentY: cy, branchIndex: i, angle: gcAngle });
          });
        }
      });
    }
  });

  return result;
}

// Curved path between two points
function curvePath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = midX - dy * 0.15;
  const cy = midY + dx * 0.15;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

const MindMapCanvas = ({
  mindMap,
  onExtend,
  extending,
}: {
  mindMap: MindMapData;
  onExtend: (nodeId: string, label: string) => void;
  extending: string | null;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const centerX = 600;
  const centerY = 450;
  const layoutNodes = useMemo(() => layoutTree(mindMap, centerX, centerY), [mindMap]);

  // Compute bounding box for auto-fit
  useEffect(() => {
    if (layoutNodes.length === 0) return;
    const xs = layoutNodes.map(n => n.x);
    const ys = layoutNodes.map(n => n.y);
    const minX = Math.min(...xs) - 120;
    const maxX = Math.max(...xs) + 120;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 80;
    const width = maxX - minX;
    const height = maxY - minY;
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scaleX = cw / width;
    const scaleY = ch / height;
    const autoScale = Math.min(scaleX, scaleY, 1) * 0.9;
    setScale(autoScale);
    setOffset({
      x: (cw - width * autoScale) / 2 - minX * autoScale,
      y: (ch - height * autoScale) / 2 - minY * autoScale,
    });
  }, [layoutNodes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setScale(s => Math.max(0.2, Math.min(2.5, s * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const nodeRadius = (depth: number) => depth === 0 ? 50 : depth === 1 ? 40 : depth === 2 ? 32 : 26;

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 p-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.max(0.2, s * 0.85))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Badge variant="outline" className="text-[10px] px-1.5 font-mono">{Math.round(scale * 100)}%</Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale(s => Math.min(2.5, s * 1.15))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
        >
          {/* Connection lines */}
          {layoutNodes.map((ln) =>
            ln.parentX !== undefined ? (
              <motion.path
                key={`line-${ln.node.id}`}
                d={curvePath(ln.parentX, ln.parentY, ln.x, ln.y)}
                stroke={ln.color}
                strokeWidth={ln.depth === 1 ? 3 : ln.depth === 2 ? 2 : 1.5}
                fill="none"
                opacity={0.5}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.6, delay: ln.depth * 0.1 }}
              />
            ) : null
          )}

          {/* Central node */}
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
            <circle cx={centerX} cy={centerY} r={54} fill="hsl(var(--primary))" opacity={0.15} />
            <circle cx={centerX} cy={centerY} r={46} fill="hsl(var(--primary))" opacity={0.25} />
            <circle cx={centerX} cy={centerY} r={38} fill="hsl(var(--primary))" />
            <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle"
              fill="hsl(var(--primary-foreground))" fontWeight="700" fontSize="13"
              className="pointer-events-none">
              {mindMap.centralTopic.length > 24 ? mindMap.centralTopic.slice(0, 22) + '…' : mindMap.centralTopic}
            </text>
          </motion.g>

          {/* Branch nodes */}
          {layoutNodes.map((ln, idx) => {
            const r = nodeRadius(ln.depth);
            const isHovered = hoveredNode === ln.node.id;
            const isExtending = extending === ln.node.id;
            const hasChildren = ln.node.children && ln.node.children.length > 0;
            const labelMax = ln.depth === 1 ? 20 : ln.depth === 2 ? 16 : 14;
            const label = ln.node.label.length > labelMax ? ln.node.label.slice(0, labelMax - 1) + '…' : ln.node.label;
            const fontSize = ln.depth === 1 ? 11 : ln.depth === 2 ? 10 : 9;

            return (
              <motion.g
                key={ln.node.id}
                initial={{ opacity: 0, x: ln.parentX || centerX, y: ln.parentY || centerY }}
                animate={{ opacity: 1, x: ln.x, y: ln.y }}
                transition={{ duration: 0.5, delay: idx * 0.03 + ln.depth * 0.1 }}
                onMouseEnter={() => setHoveredNode(ln.node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow on hover */}
                {isHovered && (
                  <circle cx={0} cy={0} r={r + 6} fill={ln.color} opacity={0.15} />
                )}

                {/* Node circle */}
                <circle
                  cx={0} cy={0} r={r}
                  fill={ln.depth === 1 ? ln.color : 'hsl(var(--background))'}
                  stroke={ln.color}
                  strokeWidth={ln.depth === 1 ? 0 : 2}
                  opacity={ln.depth === 1 ? 0.9 : 1}
                />

                {/* Label */}
                <text
                  x={0} y={ln.depth === 1 ? -2 : 0}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={ln.depth === 1 ? 'white' : 'hsl(var(--foreground))'}
                  fontWeight={ln.depth === 1 ? '700' : '500'}
                  fontSize={fontSize}
                  className="pointer-events-none"
                >
                  {label}
                </text>

                {/* Child count badge */}
                {hasChildren && ln.depth >= 2 && (
                  <>
                    <circle cx={r * 0.7} cy={-r * 0.7} r={8} fill={ln.color} />
                    <text x={r * 0.7} y={-r * 0.7} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize="8" fontWeight="700" className="pointer-events-none">
                      {ln.node.children!.length}
                    </text>
                  </>
                )}

                {/* Extend button on hover */}
                {isHovered && (
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!extending) onExtend(ln.node.id, ln.node.label);
                    }}
                    style={{ cursor: extending ? 'not-allowed' : 'pointer' }}
                  >
                    <circle cx={r + 14} cy={0} r={11} fill={ln.color} opacity={0.9} />
                    {isExtending ? (
                      <text x={r + 14} y={1} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="10" className="pointer-events-none animate-spin origin-center">⟳</text>
                    ) : (
                      <text x={r + 14} y={1} textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize="14" fontWeight="700" className="pointer-events-none">+</text>
                    )}
                  </g>
                )}

                {/* Description tooltip */}
                {isHovered && ln.node.description && (
                  <g>
                    <rect x={-100} y={r + 8} width={200} height={30} rx={6}
                      fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth={1} />
                    <text x={0} y={r + 27} textAnchor="middle" dominantBaseline="middle"
                      fill="hsl(var(--popover-foreground))" fontSize="9" className="pointer-events-none">
                      {ln.node.description && ln.node.description.length > 40
                        ? ln.node.description.slice(0, 38) + '…'
                        : ln.node.description}
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const MindMapDialog = ({ open, onOpenChange, resource, content, gradeLevel, fileName }: MindMapDialogProps) => {
  const [mindMap, setMindMap] = useState<MindMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState<string | null>(null);

  useEffect(() => {
    if (open) setMindMap(null);
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
        return { ...node, children: [...(node.children || []), ...newChildren] };
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
          content: `${content}\n\nFOCUS: Expand specifically on "${nodeLabel}" within "${mindMap.centralTopic}".`,
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
        setMindMap(prev => {
          if (!prev) return prev;
          return { ...prev, nodes: findAndAddChildren(prev.nodes, nodeId, data.nodes) };
        });
        toast.success(`Extended "${nodeLabel}" with ${data.nodes.length} branches`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to extend branch');
    }
    setExtending(null);
  }, [mindMap, content, resource, fileName, gradeLevel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-[1100px] h-[85vh] flex flex-col p-0 gap-0"
        onInteractOutside={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-4 pb-2 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Mind Map — {resource.title}
            {mindMap && (
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={generate} variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                  <RotateCcw className="h-3 w-3" /> Regenerate
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden">
          {!mindMap && !loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <div className="p-5 rounded-2xl bg-muted/30 border border-border/30 text-center max-w-md">
                <div className="text-4xl mb-3">🧠</div>
                <h4 className="font-bold text-lg mb-2">AI Mind Map</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generate a beautiful, interactive mind map of key concepts. Hover over any node and click <span className="font-bold text-primary">+</span> to expand it with AI-generated sub-topics.
                </p>
              </div>
              <Button onClick={generate} size="lg" className="gap-2 px-8 rounded-full">
                <Sparkles className="h-4 w-4" /> Generate Mind Map
              </Button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground animate-pulse">Building your mind map...</p>
            </div>
          ) : mindMap ? (
            <MindMapCanvas mindMap={mindMap} onExtend={handleExtend} extending={extending} />
          ) : null}
        </div>

        {mindMap && (
          <div className="px-5 py-2 border-t border-border/50 text-center">
            <p className="text-[11px] text-muted-foreground">
              Scroll to zoom · Drag to pan · Hover a node and click <span className="font-bold text-primary">+</span> to expand with AI
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
