import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { TopHeader } from '@/components/TopHeader';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { TimetableView } from '@/components/timetable/TimetableView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TodoView } from '@/components/todo/TodoView';
import { PomodoroView } from '@/components/pomodoro/PomodoroView';
import { GroupsView } from '@/components/groups/GroupsView';
import { ResourcesView } from '@/components/resources/ResourcesView';
import { TranscribeView } from '@/components/transcribe/TranscribeView';
import { RoleManagementView } from '@/components/admin/RoleManagementView';
import { SchoolsManagementView } from '@/components/admin/SchoolsManagementView';
import { AnnouncementsView } from '@/components/admin/AnnouncementsView';
import { AttendanceView } from '@/components/admin/AttendanceView';
import { AnalyticsView } from '@/components/admin/AnalyticsView';
import { FeatureTogglesView } from '@/components/admin/FeatureTogglesView';
import { ClassesManagementView } from '@/components/admin/ClassesManagementView';
import { AboutView } from '@/components/about/AboutView';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageTransition } from '@/components/motion/PageTransition';

// Unique per-view transition variants
const viewTransitions: Record<string, { initial: object; animate: object; exit: object }> = {
  dashboard: { initial: { opacity: 0, scale: 0.95, filter: 'blur(6px)' }, animate: { opacity: 1, scale: 1, filter: 'blur(0px)' }, exit: { opacity: 0, scale: 1.02, filter: 'blur(4px)' } },
  timetable: { initial: { opacity: 0, x: 60 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -60 } },
  calendar: { initial: { opacity: 0, y: 40, rotateX: 8 }, animate: { opacity: 1, y: 0, rotateX: 0 }, exit: { opacity: 0, y: -40, rotateX: -8 } },
  todo: { initial: { opacity: 0, x: -50, scale: 0.96 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: 50, scale: 0.96 } },
  pomodoro: { initial: { opacity: 0, scale: 0.9, rotate: -3 }, animate: { opacity: 1, scale: 1, rotate: 0 }, exit: { opacity: 0, scale: 0.9, rotate: 3 } },
  groups: { initial: { opacity: 0, y: -50 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 50 } },
  resources: { initial: { opacity: 0, x: 80, filter: 'blur(8px)' }, animate: { opacity: 1, x: 0, filter: 'blur(0px)' }, exit: { opacity: 0, x: -80, filter: 'blur(8px)' } },
  transcribe: { initial: { opacity: 0, scale: 1.1, filter: 'blur(6px)' }, animate: { opacity: 1, scale: 1, filter: 'blur(0px)' }, exit: { opacity: 0, scale: 0.9, filter: 'blur(6px)' } },
  about: { initial: { opacity: 0, y: 60, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -30 } },
};
import { FeatureDetailView } from '@/components/search/FeatureDetailView';
import { ViewType } from '@/types';
import { useRBACContext } from '@/contexts/RBACContext';
import type { FeatureItem } from '@/data/featureRegistry';

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [featureDetail, setFeatureDetail] = useState<FeatureItem | null>(null);
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
    if (canAccessView(viewType)) {
      setFeatureDetail(null);
      setCurrentView(viewType);
    }
  };

  const handleViewChange = (view: ViewType) => {
    if (canAccessView(view)) {
      setFeatureDetail(null);
      setCurrentView(view);
    }
  };

  const handleSelectFeature = (feature: FeatureItem) => {
    if (feature.route) {
      navigate(feature.route);
    } else {
      // Show the feature detail page
      setFeatureDetail(feature);
    }
  };

  const handleGoToFeature = () => {
    if (featureDetail?.viewTarget) {
      handleViewChange(featureDetail.viewTarget);
    } else if (featureDetail?.route) {
      navigate(featureDetail.route);
    }
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
          <TopHeader onSelectFeature={handleSelectFeature} />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0 bg-background">
          <AnimatePresence mode="wait">
            {featureDetail ? (
              <PageTransition key="feature-detail">
                <ErrorBoundary>
                  <FeatureDetailView
                    feature={featureDetail}
                    onBack={() => setFeatureDetail(null)}
                    onGoToFeature={handleGoToFeature}
                  />
                </ErrorBoundary>
              </PageTransition>
            ) : (
              <PageTransition key={currentView}>
                <ErrorBoundary>
                  {currentView === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
                  {currentView === 'about' && <AboutView onNavigate={handleNavigate} />}
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
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Index;
