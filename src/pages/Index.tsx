import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TimetableView } from '@/components/TimetableView';
import { CalendarView } from '@/components/CalendarView';
import { TodoView } from '@/components/TodoView';
import { PomodoroView } from '@/components/PomodoroView';
import { ViewType } from '@/types';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>('timetable');

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 overflow-auto">
        {currentView === 'timetable' && <TimetableView />}
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'todo' && <TodoView />}
        {currentView === 'pomodoro' && <PomodoroView />}
      </main>
    </div>
  );
};

export default Index;
