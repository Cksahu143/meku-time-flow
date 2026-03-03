import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface ExamPeriodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, startDate: Date, endDate: Date, description?: string) => Promise<any>;
}

export function ExamPeriodFormDialog({ open, onOpenChange, onSave }: ExamPeriodFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !dateRange?.from || !dateRange?.to) return;
    setSaving(true);
    try {
      await onSave(name.trim(), dateRange.from, dateRange.to, description.trim() || undefined);
      onOpenChange(false);
      setName('');
      setDescription('');
      setDateRange(undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Create Exam Period
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="period-name">Period Name</Label>
            <Input id="period-name" placeholder="e.g., Mid-Term Exams" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period-desc">Description (optional)</Label>
            <Textarea id="period-desc" placeholder="Notes about this exam period..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !dateRange?.from && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}` : format(dateRange.from, 'PPP')
                  ) : 'Select date range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !dateRange?.from || !dateRange?.to}>
            {saving ? 'Creating...' : 'Create Period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
