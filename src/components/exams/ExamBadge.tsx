import { cn } from '@/lib/utils';
import { Exam } from '@/hooks/useExams';
import { BookOpen } from 'lucide-react';

interface ExamBadgeProps {
  exam: Exam;
  compact?: boolean;
  onClick?: () => void;
  isStart?: boolean;
  isEnd?: boolean;
  isMiddle?: boolean;
}

export function ExamBadge({ exam, compact, onClick, isStart, isEnd, isMiddle }: ExamBadgeProps) {
  const isMultiDay = exam.end_date && exam.end_date !== exam.start_date;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 text-xs font-medium cursor-pointer transition-all hover:scale-105',
        'bg-destructive/20 text-destructive border border-destructive/30',
        compact ? 'rounded' : 'rounded-md',
        isMultiDay && isStart && 'rounded-r-none border-r-0',
        isMultiDay && isEnd && 'rounded-l-none border-l-0',
        isMultiDay && isMiddle && 'rounded-none border-x-0',
        !compact && 'shadow-sm hover:shadow-md'
      )}
    >
      {(!isMiddle && !isEnd) && <BookOpen className="w-3 h-3 flex-shrink-0" />}
      <span className={cn('truncate', compact && 'max-w-[60px]')}>
        {isMiddle || isEnd ? '...' : exam.title}
      </span>
    </div>
  );
}
