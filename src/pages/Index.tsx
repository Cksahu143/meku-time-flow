import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { TopHeader } from '@/components/TopHeader';
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
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageTransition } from '@/components/motion/PageTransition';
import { ViewType } from '@/types';
import { useRBACContext } from '@/contexts/RBACContext';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const { canAccessView, loading: rbacLoading } = useRBACContext();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/');
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading || rbacLoading) return <LoadingScreen />;

  const handleNavigate = (view: string) => {
    const viewType = view as ViewType;
    if (canAccessView(viewType)) setCurrentView(viewType);
  };

  const handleViewChange = (view: ViewType) => {
    if (canAccessView(view)) setCurrentView(view);
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar currentView={currentView} onViewChange={handleViewChange} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <div className="hidden md:block">
          <TopHeader />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0 bg-background">
          <AnimatePresence mode="wait">
            <PageTransition key={currentView}>
              <ErrorBoundary>
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
              </ErrorBoundary>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Index;
