import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { DashboardView } from '@/components/DashboardView';
import { TimetableView } from '@/components/TimetableView';
import { CalendarView } from '@/components/CalendarView';
import { TodoView } from '@/components/TodoView';
import { PomodoroView } from '@/components/PomodoroView';
import { GroupsView } from '@/components/GroupsView';
import { ResourcesView } from '@/components/ResourcesView';
import { TranscribeView } from '@/components/TranscribeView';
import { RoleManagementView } from '@/components/RoleManagementView';
import { SchoolsManagementView } from '@/components/SchoolsManagementView';
import { AnnouncementsView } from '@/components/AnnouncementsView';
import { AttendanceView } from '@/components/AttendanceView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { FeatureTogglesView } from '@/components/FeatureTogglesView';
import { ClassesManagementView } from '@/components/ClassesManagementView';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { FloatingBackground } from '@/components/motion/FloatingBackground';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageTransition } from '@/components/motion/PageTransition';
import { ViewType } from '@/types';
import { useRBACContext } from '@/contexts/RBACContext';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { canAccessView, loading: rbacLoading } = useRBACContext();

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

  if (loading || rbacLoading) {
    return <LoadingScreen />;
  }

  const handleNavigate = (view: string) => {
    const viewType = view as ViewType;
    // Only navigate if user has permission
    if (canAccessView(viewType)) {
      setCurrentView(viewType);
    }
  };

  const handleViewChange = (view: ViewType) => {
    // Only change view if user has permission
    if (canAccessView(view)) {
      setCurrentView(view);
    }
  };

  return (
    <div className="flex min-h-screen h-screen w-full bg-background overflow-hidden relative">
      {/* Floating ambient background */}
      <FloatingBackground />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block flex-shrink-0 animate-slide-in-left relative z-10">
        <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      </div>
      
      {/* Mobile Sidebar */}
      <MobileSidebar currentView={currentView} onViewChange={handleViewChange} />
      
      <AnimatedBackground viewType={currentView}>
        <main className="flex-1 w-full h-screen overflow-y-auto overflow-x-hidden pt-16 md:pt-0 relative z-10">
          <AnimatePresence mode="wait">
            <PageTransition key={currentView}>
              {currentView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
              {currentView === 'timetable' && <TimetableView />}
              {currentView === 'calendar' && <CalendarView />}
              {currentView === 'todo' && <TodoView />}
              {currentView === 'pomodoro' && <PomodoroView />}
              {currentView === 'groups' && <GroupsView />}
              {currentView === 'resources' && <ResourcesView />}
              {currentView === 'transcribe' && <TranscribeView />}
              {currentView === 'announcements' && <AnnouncementsView />}
              {currentView === 'attendance' && <AttendanceView />}
              {currentView === 'analytics' && <AnalyticsView />}
              {currentView === 'classes-management' && <ClassesManagementView />}
              {currentView === 'role-management' && <RoleManagementView />}
              {currentView === 'schools-management' && <SchoolsManagementView />}
              {currentView === 'feature-toggles' && <FeatureTogglesView />}
            </PageTransition>
          </AnimatePresence>
        </main>
      </AnimatedBackground>
    </div>
  );
};

export default Index;
