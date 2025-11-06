import { useState, useEffect } from 'react';
import { Task, Period } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ListTodo, Plus, Trash2, Edit2, Check, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TodoView() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [periods] = useLocalStorage<Period[]>('timetable', []);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    completed: false,
  });
  const [notifiedTasks, setNotifiedTasks] = useLocalStorage<string[]>('notified-tasks', []);

  const todayTasks = tasks.filter(
    (task) => task.date === new Date().toISOString().split('T')[0]
  );
  const completedToday = todayTasks.filter((task) => task.completed).length;

  // Check for due and overdue tasks
  useEffect(() => {
    const checkDueTasks = () => {
      const today = new Date().toISOString().split('T')[0];
      
      tasks.forEach((task) => {
        if (!task.completed && !notifiedTasks.includes(task.id)) {
          const taskDate = task.date;
          
          // Notify for tasks due today
          if (taskDate === today) {
            toast.info("Task due today! 📅", {
              description: task.title
            });
            setNotifiedTasks([...notifiedTasks, task.id]);
          } 
          // Notify for overdue tasks
          else if (taskDate < today) {
            toast.warning("Overdue task! ⚠️", {
              description: task.title
            });
            setNotifiedTasks([...notifiedTasks, task.id]);
          }
        }
      });
    };

    checkDueTasks();
    // Check every hour for due tasks
    const interval = setInterval(checkDueTasks, 3600000);
    return () => clearInterval(interval);
  }, [tasks, notifiedTasks, setNotifiedTasks]);

  const handleAddTask = () => {
    if (newTask.title?.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        date: newTask.date || new Date().toISOString().split('T')[0],
        priority: newTask.priority || 'medium',
        completed: false,
      };
      setTasks([...tasks, task]);
      setNewTask({
        title: '',
        date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        completed: false,
      });
      setIsAdding(false);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task.id);
    setNewTask(task);
  };

  const handleSaveEdit = () => {
    if (editingTask && newTask.title?.trim()) {
      setTasks(
        tasks.map((task) =>
          task.id === editingTask ? { ...task, ...newTask } : task
        )
      );
      setEditingTask(null);
      setNewTask({
        title: '',
        date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        completed: false,
      });
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-accent text-accent-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-full h-full p-4 md:p-6 lg:p-8 animate-slide-in-right">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ListTodo className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold text-foreground">To-Do List</h2>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground shadow-md hover:scale-105 transition-transform"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {/* Progress Header */}
      <div className="bg-gradient-primary text-primary-foreground rounded-lg p-6 mb-6 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">Today's Progress</h3>
          <div className="text-2xl font-bold">
            {completedToday}/{todayTasks.length}
          </div>
        </div>
        <div className="w-full bg-primary-foreground/20 rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary-foreground h-full transition-all duration-500 rounded-full"
            style={{
              width: `${todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Add/Edit Task Form */}
      {(isAdding || editingTask) && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-md animate-scale-in">
          <input
            type="text"
            value={newTask.title || ''}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            className="w-full px-4 py-2 mb-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Date
              </label>
              <input
                type="date"
                value={newTask.date || ''}
                onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Priority
              </label>
              <select
                value={newTask.priority || 'medium'}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    priority: e.target.value as 'low' | 'medium' | 'high',
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={editingTask ? handleSaveEdit : handleAddTask}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground hover:opacity-90 transition-opacity"
            >
              <Check className="w-4 h-4" />
              {editingTask ? 'Save' : 'Add'}
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingTask(null);
                setNewTask({
                  title: '',
                  date: new Date().toISOString().split('T')[0],
                  priority: 'medium',
                  completed: false,
                });
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListTodo className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No tasks yet. Add your first task above!</p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'bg-card border border-border rounded-lg p-4 transition-all hover:shadow-md',
                task.completed && 'opacity-60'
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleComplete(task.id)}
                  className={cn(
                    'mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    task.completed
                      ? 'bg-success border-success'
                      : 'border-muted-foreground hover:border-primary'
                  )}
                >
                  {task.completed && <Check className="w-3 h-3 text-success-foreground" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h4
                      className={cn(
                        'font-medium text-lg',
                        task.completed && 'line-through'
                      )}
                    >
                      {task.title}
                    </h4>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTask(task)}
                        className="p-1 hover:bg-secondary rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(task.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>

                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getPriorityColor(task.priority)
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
