import { Calendar, Clock, ListTodo, Timer } from 'lucide-react';
import { ViewType } from '@/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'timetable' as ViewType, label: 'Timetable', icon: Clock },
    { id: 'calendar' as ViewType, label: 'Calendar', icon: Calendar },
    { id: 'todo' as ViewType, label: 'To-Do List', icon: ListTodo },
    { id: 'pomodoro' as ViewType, label: 'Pomodoro', icon: Timer },
  ];

  return (
    <aside className="w-60 h-screen bg-card border-r border-border flex flex-col shadow-md">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Meku
        </h1>
        <p className="text-sm text-muted-foreground mt-1">School Planner</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:scale-105 active:scale-95',
                isActive
                  ? 'bg-gradient-primary text-primary-foreground shadow-md'
                  : 'text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          © 2025 Meku Planner
        </div>
      </div>
    </aside>
  );
}
