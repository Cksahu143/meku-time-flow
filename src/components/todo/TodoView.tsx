import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Period } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ListTodo, Plus, Trash2, Edit2, Check, X, Calendar, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ConfettiExplosion } from '@/components/effects/ConfettiExplosion';
import { SpringCounter } from '@/components/effects/AnimatedDigits';

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
  const [showConfetti, setShowConfetti] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === todayStr), [tasks, todayStr]);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const allDone = todayTasks.length > 0 && completedToday === todayTasks.length;

  // Check for due and overdue tasks
  useEffect(() => {
    const checkDueTasks = () => {
      const today = new Date().toISOString().split('T')[0];
      tasks.forEach((task) => {
        if (!task.completed && !notifiedTasks.includes(task.id)) {
          if (task.date === today) {
            toast.info('Task due today! 📅', { description: task.title });
            setNotifiedTasks([...notifiedTasks, task.id]);
          } else if (task.date < today) {
            toast.warning('Overdue task! ⚠️', { description: task.title });
            setNotifiedTasks([...notifiedTasks, task.id]);
          }
        }
      });
    };
    checkDueTasks();
    const interval = setInterval(checkDueTasks, 3600000);
    return () => clearInterval(interval);
  }, [tasks, notifiedTasks, setNotifiedTasks]);

  // Confetti when all today's tasks are done
  useEffect(() => {
    if (allDone) {
      setShowConfetti(true);
      toast.success('All tasks complete! 🎉🎉🎉', { description: "You're on fire today!" });
      setTimeout(() => setShowConfetti(false), 100);
    }
  }, [allDone]);

  const handleAddTask = () => {
    if (newTask.title?.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        date: newTask.date || todayStr,
        priority: newTask.priority || 'medium',
        completed: false,
      };
      setTasks([...tasks, task]);
      setNewTask({ title: '', date: todayStr, priority: 'medium', completed: false });
      setIsAdding(false);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task.id);
    setNewTask(task);
  };

  const handleSaveEdit = () => {
    if (editingTask && newTask.title?.trim()) {
      setTasks(tasks.map((t) => (t.id === editingTask ? { ...t, ...newTask } : t)));
      setEditingTask(null);
      setNewTask({ title: '', date: todayStr, priority: 'medium', completed: false });
    }
  };

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }), [tasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-accent text-accent-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.div
      className="min-h-full h-full p-4 md:p-6 lg:p-8"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <ConfettiExplosion trigger={showConfetti} particleCount={100} />

      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="p-2.5 rounded-xl bg-primary/10"
            whileHover={{ scale: 1.1, rotate: 8 }}
            whileTap={{ scale: 0.95 }}
          >
            <ListTodo className="w-6 h-6 text-primary" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-foreground font-display">To-Do List</h2>
            <p className="text-sm text-muted-foreground">Stay organized and productive</p>
          </div>
        </div>
        <motion.button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-md btn-premium"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <motion.div animate={{ rotate: isAdding ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-5 h-5" />
          </motion.div>
          Add Task
        </motion.button>
      </motion.div>

      {/* Progress Header with animated counter */}
      <motion.div
        className="card-premium rounded-2xl overflow-hidden mb-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 relative overflow-hidden">
          {allDone && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <PartyPopper className="w-24 h-24 text-primary-foreground/10" />
              </motion.div>
            </motion.div>
          )}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="text-xl font-semibold font-display">Today's Progress</h3>
            <div className="text-2xl font-bold font-display flex items-center gap-1">
              <SpringCounter value={completedToday} className="text-2xl font-bold text-primary-foreground" />
              <span>/</span>
              <SpringCounter value={todayTasks.length} className="text-2xl font-bold text-primary-foreground" />
            </div>
          </div>
          <div className="w-full bg-primary-foreground/20 rounded-full h-3 overflow-hidden relative z-10">
            <motion.div
              className="bg-primary-foreground h-full rounded-full"
              animate={{
                width: `${todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0}%`,
              }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Add/Edit Task Form */}
      <AnimatePresence>
        {(isAdding || editingTask) && (
          <motion.div
            className="card-premium rounded-2xl p-4 mb-6"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <motion.input
              type="text"
              value={newTask.title || ''}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title..."
              className="w-full px-4 py-2 mb-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
              onKeyDown={(e) => e.key === 'Enter' && (editingTask ? handleSaveEdit() : handleAddTask())}
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={newTask.date || ''}
                  onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Priority</label>
                <select
                  value={newTask.priority || 'medium'}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </motion.div>
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={editingTask ? handleSaveEdit : handleAddTask}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Check className="w-4 h-4" />
                {editingTask ? 'Save' : 'Add'}
              </motion.button>
              <motion.button
                onClick={() => {
                  setIsAdding(false);
                  setEditingTask(null);
                  setNewTask({ title: '', date: todayStr, priority: 'medium', completed: false });
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <X className="w-4 h-4" />
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks List */}
      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
        {sortedTasks.length === 0 ? (
          <motion.div
            className="text-center py-12 text-muted-foreground"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ListTodo className="w-16 h-16 mx-auto mb-4 opacity-50" />
            </motion.div>
            <p className="text-lg">No tasks yet. Add your first task above!</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task, index) => (
              <motion.div
                key={task.id}
                layout
                layoutId={task.id}
                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.9, filter: 'blur(4px)' }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 28,
                  delay: index * 0.03,
                  layout: { type: 'spring', stiffness: 300, damping: 25 },
                }}
                whileHover={{ scale: 1.015, y: -2 }}
                className={cn('card-premium rounded-2xl p-4', task.completed && 'opacity-60')}
              >
                <div className="flex items-start gap-3">
                  <motion.button
                    onClick={() => handleToggleComplete(task.id)}
                    className={cn(
                      'mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                      task.completed ? 'bg-success border-success' : 'border-muted-foreground hover:border-primary'
                    )}
                    whileHover={{ scale: 1.3 }}
                    whileTap={{ scale: 0.8 }}
                  >
                    <AnimatePresence>
                      {task.completed && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          <Check className="w-3 h-3 text-success-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <motion.h4
                        className={cn('font-medium text-lg', task.completed && 'line-through')}
                        animate={{ opacity: task.completed ? 0.5 : 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {task.title}
                      </motion.h4>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => handleEditTask(task)}
                          className="p-1 hover:bg-secondary rounded transition-colors"
                          whileHover={{ scale: 1.2, rotate: 15 }}
                          whileTap={{ scale: 0.85 }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 hover:bg-destructive/10 rounded transition-colors"
                          whileHover={{ scale: 1.2, rotate: -15 }}
                          whileTap={{ scale: 0.85 }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </motion.button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <motion.span
                        className={cn('px-2 py-1 rounded-full text-xs font-medium', getPriorityColor(task.priority))}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 }}
                      >
                        {task.priority}
                      </motion.span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
