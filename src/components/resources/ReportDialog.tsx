import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DbResource } from '@/hooks/useResources';
import { toast } from 'sonner';
import { Loader2, BarChart3, Download, TrendingUp, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianArea, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://gkkeysrfmgmxoypnjkdl.supabase.co`;

interface ReportData {
  title: string;
  summary: string;
  overallScore: number;
  overallGrade: string;
  topicBreakdown: Array<{
    topic: string;
    score: number;
    maxScore: number;
    difficulty: string;
    status: string;
  }>;
  strengthsWeaknesses: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  readinessMetrics: Array<{
    metric: string;
    value: number;
  }>;
  studyPlan: Array<{
    priority: string;
    topic: string;
    action: string;
    timeEstimate: string;
  }>;
}

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: DbResource;
  content: string;
  gradeLevel?: string;
  fileName?: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(142 71% 45%)',
  'hsl(217 91% 60%)',
  'hsl(47 96% 53%)',
  'hsl(280 65% 60%)',
];

export const ReportDialog = ({ open, onOpenChange, resource, content, gradeLevel, fileName }: ReportDialogProps) => {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/ai-study-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'report',
          content,
          title: resource.title,
          subject: resource.subject,
          resourceUrl: resource.url,
          resourceType: resource.resource_type,
          fileName: fileName || resource.file_name,
          gradeLevel,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        toast.error(err.error || 'Failed to generate report');
        setLoading(false);
        return;
      }

      const data = await resp.json();
      setReport(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate report');
    }
    setLoading(false);
  };

  const downloadReport = () => {
    if (!report) return;
    const lines = [
      `📊 STUDY PERFORMANCE REPORT`,
      `═══════════════════════════════════════`,
      `Resource: ${resource.title}`,
      `Subject: ${resource.subject}`,
      `Grade: ${gradeLevel || 'Not specified'}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      ``,
      `OVERALL: ${report.overallScore}% — ${report.overallGrade}`,
      ``,
      `SUMMARY:`,
      report.summary,
      ``,
      `TOPIC BREAKDOWN:`,
      ...report.topicBreakdown.map(t => `  • ${t.topic}: ${t.score}/${t.maxScore} (${t.difficulty}) — ${t.status}`),
      ``,
      `STRENGTHS:`,
      ...report.strengthsWeaknesses.strengths.map(s => `  ✅ ${s}`),
      ``,
      `WEAKNESSES:`,
      ...report.strengthsWeaknesses.weaknesses.map(w => `  ⚠️ ${w}`),
      ``,
      `RECOMMENDATIONS:`,
      ...report.strengthsWeaknesses.recommendations.map(r => `  💡 ${r}`),
      ``,
      `EXAM READINESS METRICS:`,
      ...report.readinessMetrics.map(m => `  ${m.metric}: ${m.value}%`),
      ``,
      `STUDY PLAN:`,
      ...report.studyPlan.map(s => `  [${s.priority}] ${s.topic}: ${s.action} (${s.timeEstimate})`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${resource.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded!');
  };

  const handleClose = (v: boolean) => {
    if (!v) { setReport(null); }
    onOpenChange(v);
  };

  const barData = report?.topicBreakdown.map(t => ({
    name: t.topic.length > 15 ? t.topic.slice(0, 15) + '…' : t.topic,
    score: Math.round((t.score / t.maxScore) * 100),
    fullName: t.topic,
  })) || [];

  const pieData = report ? [
    { name: 'Mastered', value: report.topicBreakdown.filter(t => t.status === 'mastered').length },
    { name: 'Progressing', value: report.topicBreakdown.filter(t => t.status === 'progressing').length },
    { name: 'Needs Work', value: report.topicBreakdown.filter(t => t.status === 'needs_work').length },
  ].filter(d => d.value > 0) : [];

  const PIE_COLORS = ['hsl(142 71% 45%)', 'hsl(47 96% 53%)', 'hsl(0 84% 60%)'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            AI Study Report — {resource.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {!report && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Generate AI Study Report</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                CoCo will analyze this resource and generate a comprehensive report with performance metrics, 
                topic breakdowns, readiness scores, and a personalized study plan with charts and graphs.
              </p>
              <Button onClick={generateReport} size="lg" className="gap-2 mt-2">
                <BarChart3 className="h-4 w-4" /> Generate Report
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">CoCo is analyzing the resource and generating your report...</p>
            </div>
          )}

          {report && (
            <div className="space-y-6 py-6">
              {/* Overall Score Card */}
              <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">Overall Score</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-5xl font-extrabold text-foreground">{report.overallScore}%</span>
                        <Badge variant={report.overallScore >= 80 ? 'default' : report.overallScore >= 60 ? 'secondary' : 'destructive'} className="text-xs">
                          {report.overallGrade}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 max-w-lg">{report.summary}</p>
                    </div>
                    <div className="hidden sm:block">
                      <TrendingUp className="h-16 w-16 text-primary/20" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Charts Row */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Topic Performance Bar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Topic Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minWidth: 1, minHeight: 1 }}>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(val: number) => [`${val}%`, 'Score']} />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                            {barData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Mastery Distribution Pie */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-accent" /> Mastery Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minWidth: 1, minHeight: 1 }}>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Readiness Radar */}
              {report.readinessMetrics.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-success" /> Exam Readiness Radar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ minWidth: 1, minHeight: 1 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={report.readinessMetrics}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Radar name="Readiness" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-4 w-4" /> Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {report.strengthsWeaknesses.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-success mt-0.5">✓</span>
                        <span className="text-foreground">{s}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" /> Areas to Improve
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {report.strengthsWeaknesses.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-destructive mt-0.5">!</span>
                        <span className="text-foreground">{w}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Study Plan */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">📋 Personalized Study Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.studyPlan.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                        <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] mt-0.5 shrink-0">
                          {item.priority}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.topic}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.action}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{item.timeEstimate}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">💡 Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {report.strengthsWeaknesses.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">→</span>
                      <span className="text-foreground">{r}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {report && (
          <div className="px-6 pb-6 pt-3 border-t border-border/40 flex gap-2">
            <Button onClick={downloadReport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Download Report
            </Button>
            <Button onClick={generateReport} variant="secondary" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Regenerate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
