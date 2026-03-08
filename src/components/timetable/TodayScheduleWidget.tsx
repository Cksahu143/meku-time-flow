import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { Period } from '@/types';

interface TodayScheduleWidgetProps {
  periods: Period[];
  themeColors?: Record<string, string>;
}

export const TodayScheduleWidget: React.FC<TodayScheduleWidgetProps> = ({ periods, themeColors = {} }) => {
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const todayPeriods = periods
    .filter(p => p.day === getCurrentDay())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const currentTime = getCurrentTime();
  const currentPeriodIndex = todayPeriods.findIndex(
    p => p.startTime <= currentTime && p.endTime > currentTime
  );

  const nextPeriods = currentPeriodIndex >= 0 
    ? todayPeriods.slice(currentPeriodIndex, currentPeriodIndex + 3)
    : todayPeriods.slice(0, 3);

  const getSubjectColor = (subject: string) => {
    return themeColors[subject] || 'hsl(var(--primary))';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Today's Schedule
        </CardTitle>
        <p className="text-sm text-muted-foreground">{getCurrentDay()}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {nextPeriods.length === 0 ? (
          <p className="text-sm text-muted-foreground">No classes scheduled for today</p>
        ) : (
          nextPeriods.map((period, index) => (
            <div
              key={period.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                index === 0 && currentPeriodIndex >= 0
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-muted/50'
              }`}
            >
              <div 
                className="w-1 h-full rounded-full"
                style={{ backgroundColor: period.type === 'class' ? getSubjectColor(period.subject) : 'hsl(var(--muted-foreground))' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {period.startTime} - {period.endTime}
                  </span>
                </div>
                {period.type === 'class' ? (
                  <>
                    <p className="font-medium text-sm truncate">{period.subject}</p>
                    {period.teacher && (
                      <p className="text-xs text-muted-foreground truncate">{period.teacher}</p>
                    )}
                    {period.room && (
                      <p className="text-xs text-muted-foreground">Room: {period.room}</p>
                    )}
                  </>
                ) : (
                  <p className="font-medium text-sm">
                    {period.type === 'short-break' ? 'Short Break' : 'Long Break'}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
