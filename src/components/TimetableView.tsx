import { useState, useEffect } from 'react';
import { Period } from '@/types';
import { useTimetable } from '@/hooks/useTimetable';
import { Clock, Edit2, Save, X, Plus, Trash2, Coffee, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareTimetableDialog } from '@/components/ShareTimetableDialog';
import { ThemeCustomization } from '@/components/ThemeCustomization';
import { TodayScheduleWidget } from '@/components/TodayScheduleWidget';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
  const { currentTimetable, updatePeriods, updateThemeColors, loading } = useTimetable();
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Period>>({});

  const periods = currentTimetable?.periods || [];
  const themeColors = currentTimetable?.theme_colors || {};

  // Migrate localStorage data on first load
  useEffect(() => {
    const localData = localStorage.getItem('timetable');
    if (localData && currentTimetable && currentTimetable.periods.length === 0) {
      const parsedData = JSON.parse(localData);
      if (parsedData.length > 0) {
        updatePeriods(parsedData);
        localStorage.removeItem('timetable'); // Clean up old data
      }
    }
  }, [currentTimetable]);

  const setPeriods = async (newPeriods: Period[]) => {
    await updatePeriods(newPeriods);
  };

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
    setEditForm({ ...period, type: period.type || 'class' });
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
    return periods
      .filter((p) => p.day === day)
      .sort((a, b) => {
        const [aHour, aMin] = a.startTime.split(':').map(Number);
        const [bHour, bMin] = b.startTime.split(':').map(Number);
        return aHour * 60 + aMin - (bHour * 60 + bMin);
      });
  };

  const handleAddPeriod = (day: string) => {
    const dayPeriods = getPeriodsByDay(day);
    const lastPeriod = dayPeriods[dayPeriods.length - 1];
    
    const newStartTime = lastPeriod 
      ? lastPeriod.endTime 
      : '08:00';
    
    const [hour, min] = newStartTime.split(':').map(Number);
    const newEndTime = `${(hour + 1).toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    
    const newPeriod: Period = {
      id: `${day}-${Date.now()}`,
      day,
      startTime: newStartTime,
      endTime: newEndTime,
      subject: '',
      type: 'class',
    };
    
    setPeriods([...periods, newPeriod]);
  };

  const handleDeletePeriod = (periodId: string) => {
    setPeriods(periods.filter((p) => p.id !== periodId));
  };

  const uniqueSubjects = Array.from(
    new Set(periods.filter(p => p.type === 'class' && p.subject).map(p => p.subject))
  );

  const getPeriodStyle = (period: Period) => {
    if (period.type !== 'class') return {};
    const color = themeColors[period.subject];
    return color ? { borderLeft: `4px solid ${color}` } : {};
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading timetable...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 animate-slide-in-right">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Weekly Timetable</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentTimetable && (
            <>
              <ShareTimetableDialog timetableId={currentTimetable.id} />
              <ThemeCustomization
                subjects={uniqueSubjects}
                themeColors={themeColors}
                onUpdateColors={updateThemeColors}
              />
            </>
          )}
        </div>
      </div>

      {/* Today's Schedule Widget on Mobile */}
      <div className="md:hidden mb-6">
        <TodayScheduleWidget periods={periods} themeColors={themeColors} />
      </div>

      <div className="flex gap-6">
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 min-w-max">
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
                          <Select
                            value={editForm.type || 'class'}
                            onValueChange={(value: 'class' | 'short-break' | 'long-break') =>
                              setEditForm({ ...editForm, type: value })
                            }
                          >
                            <SelectTrigger className="w-full h-8 text-sm">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="class">Class</SelectItem>
                              <SelectItem value="short-break">Short Break</SelectItem>
                              <SelectItem value="long-break">Long Break</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs opacity-75">Start</label>
                              <Input
                                type="time"
                                value={editForm.startTime || ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, startTime: e.target.value })
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs opacity-75">End</label>
                              <Input
                                type="time"
                                value={editForm.endTime || ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, endTime: e.target.value })
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          {(editForm.type === 'class' || !editForm.type) && (
                            <>
                              <Input
                                type="text"
                                value={editForm.subject || ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, subject: e.target.value })
                                }
                                placeholder="Subject"
                                className="h-8 text-sm"
                              />
                              <Input
                                type="text"
                                value={editForm.teacher || ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, teacher: e.target.value })
                                }
                                placeholder="Teacher"
                                className="h-8 text-sm"
                              />
                              <Input
                                type="text"
                                value={editForm.room || ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, room: e.target.value })
                                }
                                placeholder="Room"
                                className="h-8 text-sm"
                              />
                            </>
                          )}

                          <div className="flex gap-2">
                            <Button
                              onClick={handleSave}
                              size="sm"
                              className="flex-1 h-8 text-xs"
                            >
                              <Save className="w-3 h-3 mr-1" /> Save
                            </Button>
                            <Button
                              onClick={handleCancel}
                              variant="destructive"
                              size="sm"
                              className="flex-1 h-8 text-xs"
                            >
                              <X className="w-3 h-3 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium opacity-75">
                              {period.startTime} - {period.endTime}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEdit(period)}
                                className="opacity-50 hover:opacity-100 transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeletePeriod(period.id)}
                                className="opacity-50 hover:opacity-100 hover:text-destructive transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          {period.type === 'short-break' || period.type === 'long-break' ? (
                            <div className="font-semibold text-sm">
                              {period.type === 'short-break' ? '☕ Short Break' : '🍽️ Long Break'}
                            </div>
                          ) : (
                            <>
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
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <Button
                onClick={() => handleAddPeriod(day)}
                variant="outline"
                size="sm"
                className="w-full mt-2 h-8 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Period
              </Button>
            </div>
            );
          })}
          </div>
        </div>

        {/* Today's Schedule Widget on Desktop */}
        <div className="hidden md:block w-80 flex-shrink-0">
          <TodayScheduleWidget periods={periods} themeColors={themeColors} />
        </div>
      </div>
    </div>
  );
}
