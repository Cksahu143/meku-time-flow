import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { TimetableView } from '@/components/TimetableView';
import { CalendarView } from '@/components/CalendarView';
import { TodoView } from '@/components/TodoView';
import { PomodoroView } from '@/components/PomodoroView';
import { GroupsView } from '@/components/GroupsView';
import { ResourcesView } from '@/components/ResourcesView';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ViewType } from '@/types';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>('timetable');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/');
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex min-h-screen h-screen w-full bg-background overflow-hidden">
      <div className="hidden md:block flex-shrink-0 animate-slide-in-left">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      </div>
      <MobileSidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <AnimatedBackground viewType={currentView}>
        <main className="flex-1 w-full h-screen overflow-y-auto overflow-x-hidden pt-16 md:pt-0">
          <div className="animate-fade-in">
            {currentView === 'timetable' && <TimetableView />}
            {currentView === 'calendar' && <CalendarView />}
            {currentView === 'todo' && <TodoView />}
            {currentView === 'pomodoro' && <PomodoroView />}
            {currentView === 'groups' && <GroupsView />}
            {currentView === 'resources' && <ResourcesView />}
          </div>
        </main>
      </AnimatedBackground>
    </div>
  );
};

export default Index;
