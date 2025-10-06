import { useState } from 'react';
import { Period } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Clock, Edit2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_PERIODS: Period[] = [];

// Generate default periods
DAYS.forEach((day, dayIndex) => {
  for (let i = 0; i < 7; i++) {
    const startHour = 8 + i;
    DEFAULT_PERIODS.push({
      id: `${day}-${i}`,
      day,
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      endTime: `${(startHour + 1).toString().padStart(2, '0')}:00`,
      subject: '',
      teacher: '',
      room: '',
    });
  }
});

export function TimetableView() {
  const [periods, setPeriods] = useLocalStorage<Period[]>('timetable', DEFAULT_PERIODS);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Period>>({});

  const getCurrentDay = () => {
    const day = new Date().getDay();
    return day === 0 ? null : DAYS[day - 1];
  };

  const getCurrentPeriod = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    return periods.find((period) => {
      const [startHour, startMin] = period.startTime.split(':').map(Number);
      const [endHour, endMin] = period.endTime.split(':').map(Number);
      const periodStart = startHour * 60 + startMin;
      const periodEnd = endHour * 60 + endMin;

      return (
        period.day === getCurrentDay() &&
        currentTime >= periodStart &&
        currentTime < periodEnd
      );
    });
  };

  const currentDay = getCurrentDay();
  const currentPeriod = getCurrentPeriod();

  const handleEdit = (period: Period) => {
    setEditingPeriod(period.id);
    setEditForm(period);
  };

  const handleSave = () => {
    if (editingPeriod && editForm) {
      setPeriods(
        periods.map((p) => (p.id === editingPeriod ? { ...p, ...editForm } : p))
      );
      setEditingPeriod(null);
      setEditForm({});
    }
  };

  const handleCancel = () => {
    setEditingPeriod(null);
    setEditForm({});
  };

  const getPeriodsByDay = (day: string) => {
    return periods.filter((p) => p.day === day);
  };

  return (
    <div className="p-6 animate-slide-in-right">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-8 h-8 text-primary" />
        <h2 className="text-3xl font-bold text-foreground">Weekly Timetable</h2>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {DAYS.map((day) => {
          const isToday = day === currentDay;

          return (
            <div key={day} className="space-y-3">
              <div
                className={cn(
                  'p-3 rounded-lg text-center font-semibold transition-all',
                  isToday
                    ? 'bg-gradient-primary text-primary-foreground shadow-md'
                    : 'bg-secondary text-secondary-foreground'
                )}
              >
                {day}
              </div>

              <div className="space-y-2">
                {getPeriodsByDay(day).map((period) => {
                  const isCurrent =
                    currentPeriod?.id === period.id && isToday;
                  const isEditing = editingPeriod === period.id;

                  return (
                    <div
                      key={period.id}
                      className={cn(
                        'p-3 rounded-lg border transition-all duration-200',
                        'hover:shadow-md hover:scale-105',
                        isCurrent &&
                          'bg-gradient-accent text-accent-foreground border-accent shadow-accent animate-pulse',
                        !isCurrent && period.subject && 'bg-card border-border',
                        !isCurrent && !period.subject && 'bg-muted border-border opacity-60'
                      )}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editForm.subject || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, subject: e.target.value })
                            }
                            placeholder="Subject"
                            className="w-full px-2 py-1 text-sm rounded bg-background border border-input"
                          />
                          <input
                            type="text"
                            value={editForm.teacher || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, teacher: e.target.value })
                            }
                            placeholder="Teacher"
                            className="w-full px-2 py-1 text-sm rounded bg-background border border-input"
                          />
                          <input
                            type="text"
                            value={editForm.room || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, room: e.target.value })
                            }
                            placeholder="Room"
                            className="w-full px-2 py-1 text-sm rounded bg-background border border-input"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-sm bg-success text-success-foreground rounded hover:opacity-90"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={handleCancel}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:opacity-90"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium opacity-75">
                              {period.startTime} - {period.endTime}
                            </span>
                            <button
                              onClick={() => handleEdit(period)}
                              className="opacity-50 hover:opacity-100 transition-opacity"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="font-semibold text-sm">
                            {period.subject || 'Free Period'}
                          </div>
                          {period.teacher && (
                            <div className="text-xs opacity-75 mt-1">
                              {period.teacher}
                            </div>
                          )}
                          {period.room && (
                            <div className="text-xs opacity-75">Room {period.room}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
