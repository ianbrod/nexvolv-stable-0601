'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MoreVertical, Info, Calendar, Edit, Trash, X } from 'lucide-react';
import { Task, Goal, Reminder } from '@/types';
import { TaskStatus, TaskPriority, Category } from '@prisma/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useReminders } from '@/contexts/ReminderContext';
import { RecurringReminderActionDialog } from '@/components/reminders/RecurringReminderActionDialog';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  addDays,
  parseISO,
  isWithinInterval,
  setHours, setMinutes, setSeconds, setMilliseconds, parse
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DndContext,
  useDraggable,
  useDroppable,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ReminderActionMenu } from '@/components/reminders/ReminderActionMenu';
import { ReminderEditModal } from '@/components/reminders/ReminderEditModal';
import { ReminderDetailsModal } from '@/components/reminders/ReminderDetailsModal';
import { SoftSquareIcon } from '@/components/ui/soft-square-icon';
import { TaskModal } from '@/components/tasks/TaskModal';
import { SimpleTaskItem } from '@/components/tasks/SimpleTaskItem';

// --- Helper Functions ---
const isWeekend = (day: Date) => {
  const dayOfWeek = day.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

// --- Interfaces ---
interface MonthViewProps {
  tasks: Task[]; // Use tasks prop directly
  goals?: Goal[];
  categories?: Category[];
  reminders?: Reminder[]; // Add reminders prop
  currentDate: Date;
  onDayClick?: (date: Date) => void;
  onTaskDrop?: (taskId: string, newDate: Date) => void; // Keep for calling parent handler
  onReminderDrop?: (reminderId: string, newDate: Date) => void; // Add handler for reminder drops
  taskOrderBySlot?: Record<string, string[]>; // Shared task order state from parent
  onReminderRefresh?: () => Promise<void>; // Add callback for refreshing reminders after actions
  /** Enable calendar grid virtualization for large date ranges */
  enableVirtualization?: boolean;
  /** Enable lazy loading for day content */
  enableLazyLoading?: boolean;
  /** Maximum number of items to show per day before "show more" */
  maxItemsPerDay?: number;
}

// --- Main Component ---
// Removed local tasks state - component now uses the tasks prop directly
export function MonthView({
  tasks,
  goals: originalGoals = [],
  categories = [],
  reminders = [],
  currentDate,
  onDayClick,
  onTaskDrop,
  onReminderDrop,
  taskOrderBySlot = {},
  onReminderRefresh,
  enableVirtualization = false,
  enableLazyLoading = true,
  maxItemsPerDay = 4
}: MonthViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const goals = originalGoals;

  // State for day items modal
  const [dayItemsModalOpen, setDayItemsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);
  const [selectedDayGoals, setSelectedDayGoals] = useState<Goal[]>([]);
  const [selectedDayReminders, setSelectedDayReminders] = useState<Reminder[]>([]);

  // State for task editing
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);

  // State for reminder modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeReminderForModal, setActiveReminderForModal] = useState<Reminder | null>(null);

  // Removed useEffect for setTasks

  // Memoized day calculation for better performance
  const getDaysInMonthView = useCallback(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const days = useMemo(() => getDaysInMonthView(), [getDaysInMonthView]);

  // Virtualization state
  const [visibleDayRange, setVisibleDayRange] = useState<{ start: number; end: number }>({ start: 0, end: days.length });
  const [loadedDays, setLoadedDays] = useState<Set<string>>(new Set());

  // tasksByDate now directly depends on the tasks prop and taskOrderBySlot
  const tasksByDate = useMemo(() => {
    // First, group tasks by date
    const groupedByDate: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        try {
          const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
          if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
            const dateKey = format(dueDate, 'yyyy-MM-dd');
            if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
            groupedByDate[dateKey].push(task);
          }
        } catch (e) { console.error("MonthView: Error processing task due date:", e, task); }
      }
    });

    // Then, apply custom ordering from week view
    const orderedByDate: Record<string, Task[]> = {};

    Object.entries(groupedByDate).forEach(([dateKey, dateTasks]) => {
      // Group tasks by hour for this date
      const tasksByHour: Record<number, Task[]> = {};
      dateTasks.forEach(task => {
        if (!task.dueDate) return;
        const dueDate = new Date(task.dueDate);
        const hour = dueDate.getHours();
        const normalizedHour = (hour >= 0 && hour < 5) ? 5 : (hour > 23) ? 23 : hour;
        if (!tasksByHour[normalizedHour]) tasksByHour[normalizedHour] = [];
        tasksByHour[normalizedHour].push(task);
      });

      // Apply ordering for each hour and combine into final result
      orderedByDate[dateKey] = [];

      Object.entries(tasksByHour).forEach(([hourStr, hourTasks]) => {
        const hour = parseInt(hourStr, 10);
        const slotId = `${dateKey}-${hour}`;

        if (taskOrderBySlot[slotId]) {
          // If we have custom ordering for this slot, use it
          const tasksById = hourTasks.reduce((acc, task) => {
            acc[task.id] = task;
            return acc;
          }, {} as Record<string, Task>);

          // First add tasks in the custom order
          const orderedTasks: Task[] = [];
          taskOrderBySlot[slotId].forEach(taskId => {
            if (tasksById[taskId]) {
              orderedTasks.push(tasksById[taskId]);
              delete tasksById[taskId]; // Remove from map to avoid duplicates
            }
          });

          // Then add any remaining tasks not in the custom order
          Object.values(tasksById).forEach(task => {
            orderedTasks.push(task);
          });

          // Add the ordered tasks to the result
          orderedByDate[dateKey].push(...orderedTasks);
        } else {
          // No custom ordering, just add the tasks as is
          orderedByDate[dateKey].push(...hourTasks);
        }
      });
    });

    return orderedByDate;
  }, [tasks, taskOrderBySlot]); // Depend on tasks prop and taskOrderBySlot

  const goalsByDate = useMemo(() => goals.reduce((acc, goal) => {
    if (goal.targetCompletionDate) {
      try {
        const deadline = new Date(goal.targetCompletionDate);
         if (deadline instanceof Date && !isNaN(deadline.getTime())) {
            const dateKey = format(deadline, 'yyyy-MM-dd');
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(goal);
         } else {
             // console.warn("MonthView: Invalid targetCompletionDate for goal:", goal.id, goal.targetCompletionDate);
         }
      } catch (e) {
        console.error("MonthView: Error processing goal deadline:", e, goal);
      }
    }
    return acc;
  }, {} as Record<string, Goal[]>), [goals]);

  // Group reminders by date
  const remindersByDate = useMemo(() => reminders.reduce((acc, reminder) => {
    if (reminder.dueDate) {
      try {
        const dueDate = reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate);
        if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
          const dateKey = format(dueDate, 'yyyy-MM-dd');
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(reminder);
        }
      } catch (e) {
        console.error("MonthView: Error processing reminder due date:", e, reminder);
      }
    }
    return acc;
  }, {} as Record<string, Reminder[]>), [reminders]);

  const getTasksForDay = (day: Date) => tasksByDate[format(day, 'yyyy-MM-dd')] || [];
  const getGoalsForDay = (day: Date) => goalsByDate[format(day, 'yyyy-MM-dd')] || [];
  const getRemindersForDay = (day: Date) => remindersByDate[format(day, 'yyyy-MM-dd')] || [];
  const handleDayClickInternal = (day: Date) => onDayClick && onDayClick(day);

  // Handler for clicking the "+ X more" indicator
  const handleDayItemsClick = (day: Date, dayTasks: Task[], dayGoals: Goal[], dayReminders: Reminder[]) => {
    setSelectedDay(day);
    setSelectedDayTasks(dayTasks);
    setSelectedDayGoals(dayGoals);
    setSelectedDayReminders(dayReminders);
    setDayItemsModalOpen(true);
  };

  // Handler for task editing
  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskEditModalOpen(true);
  };

  // Handler for closing task edit modal
  const handleTaskEditModalClose = () => {
    setIsTaskEditModalOpen(false);
    setEditingTask(null);
  };

  // --- DND Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id.toString();

    // Check if this is a task or a reminder
    if (activeId.startsWith('drag-task-')) {
      const taskId = activeId.replace('drag-task-', '');
      // Find task from the tasks prop
      const task = tasks.find(t => t.id === taskId);
      setActiveTask(task || null);
    } else if (activeId.startsWith('drag-reminder-')) {
      const reminderId = activeId.replace('drag-reminder-', '');
      // Find reminder from the reminders prop
      const reminder = reminders.find(r => r.id === reminderId);
      setActiveReminder(reminder || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset active states
    setActiveTask(null);
    setActiveReminder(null);

    if (!over || active.id === over.id || !over.id.toString().startsWith('drop-day-')) return;

    const activeId = active.id.toString();
    const targetDayStr = over.id.toString().replace('drop-day-', '');
    const newDateBase = parse(targetDayStr, 'yyyy-MM-dd', new Date());

    try {
      // Handle task drops
      if (activeId.startsWith('drag-task-')) {
        const taskId = activeId.replace('drag-task-', '');

        // Find the original task to preserve time
        const originalTask = tasks.find(t => t.id === taskId);
        if (!originalTask) {
          console.error("Task not found:", taskId);
          return;
        }

        let newDate = new Date(newDateBase);
        const originalDueDate = originalTask.dueDate ? (originalTask.dueDate instanceof Date ? originalTask.dueDate : new Date(originalTask.dueDate)) : new Date();

        if (originalDueDate instanceof Date && !isNaN(originalDueDate.getTime())) {
            newDate = setHours(newDate, originalDueDate.getHours());
            newDate = setMinutes(newDate, originalDueDate.getMinutes());
            newDate = setSeconds(newDate, originalDueDate.getSeconds());
            newDate = setMilliseconds(newDate, originalDueDate.getMilliseconds());
        } else {
            newDate = setHours(newDate, 12);
            newDate = setMinutes(newDate, 0);
            newDate = setSeconds(newDate, 0);
            newDate = setMilliseconds(newDate, 0);
        }

        // Call the onTaskDrop prop to trigger the update in the parent (CalendarContainer)
        if (onTaskDrop) {
          onTaskDrop(taskId, newDate);
        }
      }
      // Handle reminder drops
      else if (activeId.startsWith('drag-reminder-')) {
        const reminderId = activeId.replace('drag-reminder-', '');

        // Find the original reminder to preserve time
        const originalReminder = reminders.find(r => r.id === reminderId);
        if (!originalReminder) {
          console.error("Reminder not found:", reminderId);
          return;
        }

        let newDate = new Date(newDateBase);
        const originalDueDate = originalReminder.dueDate instanceof Date ? originalReminder.dueDate : new Date(originalReminder.dueDate);

        if (originalDueDate instanceof Date && !isNaN(originalDueDate.getTime())) {
            newDate = setHours(newDate, originalDueDate.getHours());
            newDate = setMinutes(newDate, originalDueDate.getMinutes());
            newDate = setSeconds(newDate, originalDueDate.getSeconds());
            newDate = setMilliseconds(newDate, originalDueDate.getMilliseconds());
        } else {
            newDate = setHours(newDate, 12);
            newDate = setMinutes(newDate, 0);
            newDate = setSeconds(newDate, 0);
            newDate = setMilliseconds(newDate, 0);
        }

        // Call the onReminderDrop prop to trigger the update in the parent (CalendarContainer)
        if (onReminderDrop) {
          onReminderDrop(reminderId, newDate);
        }
      }
    } catch (e) {
      console.error("Error processing drag end:", e);
    }
  };

  return (
    <TooltipProvider>
      <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
      >
        <div className="h-full w-full flex flex-col" data-testid="month-view">
        {/* Headers - Half height weekdays, bigger and bolder */}
        <div className="grid grid-cols-7 gap-px text-base font-black text-gray-700 dark:text-gray-300 border-b h-6 flex-shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="flex items-center justify-center h-6 -mt-1">{d}</div>)}
        </div>

        {/* Grid - Use flex-1 to take remaining space */}
        <div className="grid grid-cols-7 flex-1 border-t border-l border-gray-100 dark:border-gray-800">
          {days.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, currentDate);
            const dayTasks = getTasksForDay(day);
            const dayGoals = getGoalsForDay(day);
            const dayReminders = getRemindersForDay(day);
            const taskCount = dayTasks.length;
            const goalCount = dayGoals.length;
            const reminderCount = dayReminders.length;

            // Separate first task for header row
            const firstTask = dayTasks.length > 0 ? dayTasks[0] : null;
            const remainingTasks = dayTasks.slice(1);

            return (
              <DroppableDayCell
                key={dayKey}
                id={`drop-day-${dayKey}`}
                day={day}
                isCurrentMonth={isCurrentMonth}
                taskCount={taskCount}
                goalCount={goalCount}
                reminderCount={dayReminders.length}
                onDayClick={handleDayClickInternal}
                firstTask={firstTask}
                reminders={dayReminders.slice(0, 4)} // Pass reminders for the reminder column
                onDayItemsClick={handleDayItemsClick}
                dayTasks={dayTasks}
                dayGoals={dayGoals}
                allReminders={dayReminders}
                onReminderRefresh={onReminderRefresh}
                onOpenEditModal={(reminder) => {
                  setActiveReminderForModal(reminder);
                  setEditModalOpen(true);
                }}
                onOpenDetailsModal={(reminder) => {
                  setActiveReminderForModal(reminder);
                  setDetailsModalOpen(true);
                }}
                onTaskEdit={handleTaskEdit}
              >
                {/* Goals */}
                {dayGoals.slice(0, 1).map((goal) => (
                  <div key={goal.id} className="text-xs px-1 py-0.5 rounded truncate bg-purple-100 text-purple-700 border-l-2 border-purple-500 pointer-events-none" title={`Goal Deadline: ${goal.name}`}>
                    🎯 {goal.name}
                  </div>
                ))}

                {/* Remaining Tasks (excluding first task which is in header) */}
                {remainingTasks.slice(0, 4 - Math.min(1, goalCount)).map((task) => (
                  <DraggableTaskItem key={task.id} task={task} onEdit={handleTaskEdit} />
                ))}


              </DroppableDayCell>
            );
          })}
        </div>
      </div>
      {/* Add dropAnimation={null} here */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskItemOverlay task={activeTask} />
        ) : activeReminder ? (
          <ReminderItemOverlay reminder={activeReminder} />
        ) : null}
      </DragOverlay>

      {/* Day Items Modal */}
      <DayItemsModal
        isOpen={dayItemsModalOpen}
        onClose={() => setDayItemsModalOpen(false)}
        day={selectedDay}
        tasks={selectedDayTasks}
        goals={selectedDayGoals}
        reminders={selectedDayReminders}
        onTaskEdit={handleTaskEdit}
        onReminderEdit={(reminder) => {
          setActiveReminderForModal(reminder);
          setEditModalOpen(true);
        }}
        onReminderRefresh={onReminderRefresh}
      />

      {/* Reminder Modals */}
      {activeReminderForModal && (
        <>
          <ReminderEditModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setActiveReminderForModal(null);
              if (onReminderRefresh) onReminderRefresh();
            }}
            reminder={activeReminderForModal}
          />
          <ReminderDetailsModal
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setActiveReminderForModal(null);
            }}
            reminder={activeReminderForModal}
          />
        </>
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskModal
          isOpen={isTaskEditModalOpen}
          onOpenChange={handleTaskEditModalClose}
          mode="edit"
          initialData={editingTask}
          goals={goals}
          categories={categories}
        />
      )}
      </DndContext>
    </TooltipProvider>
  );
}


// --- Droppable Day Cell Component ---
interface DroppableDayCellProps {
  id: UniqueIdentifier;
  day: Date;
  isCurrentMonth: boolean;
  taskCount: number;
  goalCount: number;
  reminderCount: number;
  children: React.ReactNode;
  onDayClick: (date: Date) => void;
  firstTask?: Task | null;
  reminders?: Reminder[];
  onDayItemsClick: (day: Date, dayTasks: Task[], dayGoals: Goal[], dayReminders: Reminder[]) => void;
  dayTasks: Task[];
  dayGoals: Goal[];
  allReminders: Reminder[];
  onReminderRefresh?: () => Promise<void>;
  onOpenEditModal?: (reminder: Reminder) => void;
  onOpenDetailsModal?: (reminder: Reminder) => void;
  onTaskEdit?: (task: Task) => void;
}

function DroppableDayCell({
  id,
  day,
  isCurrentMonth,
  taskCount,
  goalCount,
  reminderCount,
  children,
  onDayClick,
  firstTask,
  reminders = [],
  onDayItemsClick,
  dayTasks,
  dayGoals,
  allReminders,
  onReminderRefresh,
  onOpenEditModal,
  onOpenDetailsModal,
  onTaskEdit
}: DroppableDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: id, data: { date: day } });

  // Calculate overflow
  const shownGoals = Math.min(1, goalCount);
  const shownReminders = Math.min(4, reminderCount);
  const shownFirstTask = firstTask ? 1 : 0;
  const remainingTasks = dayTasks.slice(1);
  const shownRemainingTasks = Math.min(Math.max(0, 4 - shownGoals), remainingTasks.length);
  const totalShown = shownGoals + shownReminders + shownFirstTask + shownRemainingTasks;
  const totalItems = taskCount + goalCount + reminderCount;
  const hiddenItems = totalItems - totalShown;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full min-h-[100px] border-r border-b border-gray-100 dark:border-gray-800 relative flex flex-col overflow-hidden",
        !isCurrentMonth && "bg-gray-50 text-gray-400 dark:bg-gray-950/80 dark:text-gray-600",
        isToday(day) && "bg-primary/5 border border-purple-500/65 dark:bg-primary/5 dark:border-purple-500/65",
        isWeekend(day) && isCurrentMonth && "bg-gray-50/50 dark:bg-gray-900/60",
        // Removed hover and cursor-pointer styles
        isOver && "bg-primary/10 ring-1 ring-primary"
      )}
      // Removed onClick handler
      // Removed onKeyDown handler
      // Removed tabIndex and role attributes
      aria-label={`${format(day, 'EEEE, MMMM d, yyyy')}, ${taskCount} tasks. Drop target.`}
    >
      {/* Two-column layout: wide column for tasks, narrow column for day/reminders */}
      <div className="flex h-full">
        {/* Left column: All tasks */}
        <div className="flex-1 mr-1 flex flex-col h-full overflow-hidden p-1" style={{ gap: '2px' }}>
          {/* First task */}
          {firstTask && (
            <DraggableTaskItem key={firstTask.id} task={firstTask} onEdit={onTaskEdit} />
          )}
          {/* All other content */}
          <div className="flex-1 flex flex-col" style={{ gap: '2px' }}>
            {children}
          </div>
        </div>

        {/* Right column: Day number and reminder icons */}
        <div className="w-6 flex-shrink-0 flex flex-col items-center relative p-1">
          {/* Day number */}
          <div className={cn(
            "text-sm font-medium mb-1",
            isToday(day) && "text-purple-600 dark:text-purple-400"
          )}>
            {format(day, 'd')}
          </div>
          {/* Reminder icons stacked vertically */}
          <div className="flex flex-col items-center gap-0.5">
            {reminders.map((reminder, index) => (
              <MonthReminderDot
                key={reminder.id}
                reminder={reminder}
                index={index}
                onRefresh={onReminderRefresh}
                onOpenEditModal={onOpenEditModal}
                onOpenDetailsModal={onOpenDetailsModal}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Plus button in bottom right corner - shows when any items exist */}
      {totalItems > 0 && (
        <div
          className="absolute bottom-1 right-1 w-4 h-4 text-xs text-gray-500 cursor-pointer hover:bg-gray-100 hover:text-primary transition-colors rounded-full flex items-center justify-center font-bold z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDayItemsClick(day, dayTasks, dayGoals, allReminders);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onDayItemsClick(day, dayTasks, dayGoals, allReminders);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Show all ${totalItems} items for ${format(day, 'MMMM d, yyyy')}`}
        >
          +
        </div>
      )}
    </div>
  );
}


// --- Month Reminder Dot Component ---
interface MonthReminderDotProps {
  reminder: Reminder;
  index: number;
  onRefresh?: () => Promise<void>;
  onOpenEditModal?: (reminder: Reminder) => void;
  onOpenDetailsModal?: (reminder: Reminder) => void;
}

function MonthReminderDot({ reminder, index, onRefresh, onOpenEditModal, onOpenDetailsModal }: MonthReminderDotProps) {
  const dotSize = 12; // Smaller size for month view

  const { deleteReminder, dismissReminderItem } = useReminders();

  // Check if this is a virtual instance
  const isVirtualInstance = 'isVirtualInstance' in reminder && reminder.isVirtualInstance === true;

  // Check if this is a recurring reminder
  const isRecurring = reminder.isRecurring || isVirtualInstance;

  // State for menu and dismissal
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'dismiss' | 'delete'>('dismiss');

  // Get category color for this reminder
  const getCategoryColor = (): string => {
    // If reminder has a direct category with a color
    if (reminder.category && typeof reminder.category === 'object' && reminder.category.color) {
      return reminder.category.color;
    }

    // If reminder has a goal with a category with a color
    if (reminder.goal && typeof reminder.goal === 'object' &&
        reminder.goal.category && typeof reminder.goal.category === 'object' &&
        reminder.goal.category.color) {
      return reminder.goal.category.color;
    }

    // No category color found, use default red
    return '#ef4444';
  };

  const categoryColor = getCategoryColor();

  // Handle dismiss action with visual feedback
  const handleDismiss = async () => {
    // For recurring reminders, show the confirmation dialog
    if (isRecurring) {
      setCurrentAction('dismiss');
      setRecurringDialogOpen(true);
      return;
    }

    // For non-recurring reminders, dismiss directly
    await dismissSingleReminder();
  };

  // Handle delete action
  const handleDelete = async () => {
    // For recurring reminders, show the confirmation dialog
    if (isRecurring) {
      setCurrentAction('delete');
      setRecurringDialogOpen(true);
      return;
    }

    // For non-recurring reminders, show delete confirmation dialog
    setIsDeleteDialogOpen(true);
  };

  // Dismiss just this single reminder
  const dismissSingleReminder = async () => {
    setIsDismissing(true);
    try {
      console.log("MonthView ReminderDot: Dismissing single reminder ID:", reminder.id);
      const result = await dismissReminderItem(reminder.id);

      if (result.success) {
        console.log("Reminder dismissed successfully");

        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to dismiss reminder";
        console.error("Error dismissing reminder:", errorMessage);
      }
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    } finally {
      setIsDismissing(false);
      setRecurringDialogOpen(false);
    }
  };

  // Dismiss all occurrences of this recurring reminder
  const dismissAllReminders = async () => {
    setIsDismissing(true);
    try {
      // For virtual instances, we need to get the original reminder ID
      const originalId = isVirtualInstance && reminder.originalReminderId
        ? reminder.originalReminderId
        : reminder.id;

      console.log("MonthView ReminderDot: Dismissing all occurrences of reminder ID:", originalId);
      // Pass true as the second parameter to indicate dismissing all occurrences
      const result = await dismissReminderItem(originalId, true);

      if (result.success) {
        console.log("All reminders dismissed successfully");

        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to dismiss reminders";
        console.error("Error dismissing reminders:", errorMessage);
      }
    } catch (error) {
      console.error("Error dismissing all reminders:", error);
    } finally {
      setIsDismissing(false);
      setRecurringDialogOpen(false);
    }
  };

  // Delete just this single reminder
  const deleteSingleReminder = async () => {
    setIsDeleting(true);
    try {
      console.log("MonthView ReminderDot: Deleting single reminder ID:", reminder.id);
      const result = await deleteReminder(reminder.id);

      if (result.success) {
        console.log("Reminder deleted successfully");

        // Refresh the UI
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to delete reminder";
        console.error("Error deleting reminder:", errorMessage);
      }
    } catch (error) {
      console.error("Error deleting reminder:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setRecurringDialogOpen(false);
    }
  };

  // Delete all occurrences of this recurring reminder
  const deleteAllReminders = async () => {
    setIsDeleting(true);
    try {
      // For virtual instances, we need to get the original reminder ID
      const originalId = isVirtualInstance && reminder.originalReminderId
        ? reminder.originalReminderId
        : reminder.id;

      console.log("MonthView ReminderDot: Deleting all occurrences of reminder ID:", originalId);
      const result = await deleteReminder(originalId, true);

      if (result.success) {
        console.log("All reminders deleted successfully");

        // Refresh the UI
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to delete reminders";
        console.error("Error deleting reminders:", errorMessage);
      }
    } catch (error) {
      console.error("Error deleting all reminders:", error);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setRecurringDialogOpen(false);
    }
  };

  return (
    <>
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()} // Stop propagation to prevent day click handler
      >
        {!isMenuOpen ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "transition-all pointer-events-auto cursor-pointer",
                  isDismissing && "opacity-70"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(true);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMenuOpen(true);
                }}
              >
                <SoftSquareIcon
                  size={dotSize}
                  color={categoryColor}
                  isCompleted={reminder.isCompleted}
                  isRecurring={reminder.isRecurring}
                  isVirtualInstance={isVirtualInstance}
                  isDismissing={isDismissing}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="p-0 border-2 shadow-md pointer-events-none">
              <div className="flex flex-col gap-1 text-xs p-0 max-w-xs bg-card rounded-md">
                <div
                  className="p-2 rounded-t-md border-b border-slate-200 dark:border-slate-700"
                  style={{
                    backgroundColor: categoryColor ? `${categoryColor}20` : undefined, // 20% opacity
                    borderTopColor: categoryColor || undefined
                  }}
                >
                  <h4 className={cn(
                    "font-semibold text-sm text-slate-900 dark:text-white",
                    reminder.isCompleted && "line-through text-gray-500 dark:text-gray-400"
                  )}>
                    {reminder.title}
                  </h4>
                  {reminder.description && (
                    <p className={cn(
                      "text-muted-foreground line-clamp-2 text-xs",
                      reminder.isCompleted && "text-gray-400"
                    )}>
                      {reminder.description}
                    </p>
                  )}
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge
                      className={cn(
                        "text-xs px-1 py-0.5 font-normal",
                        reminder.isCompleted
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}
                    >
                      {reminder.isCompleted ? 'Completed' : 'Pending'}
                    </Badge>

                    {reminder.isRecurring && (
                      <Badge
                        className={cn(
                          "text-xs px-1 py-0.5 font-normal bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          reminder.isCompleted && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        )}
                      >
                        Recurring
                      </Badge>
                    )}

                    {('isVirtualInstance' in reminder && reminder.isVirtualInstance) && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-1 py-0.5 font-normal border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400",
                          reminder.isCompleted && "border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                        )}
                      >
                        Instance
                      </Badge>
                    )}
                  </div>

                  {reminder.dueDate && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      Due: {format(new Date(reminder.dueDate), 'MMM d, h:mm a')}
                    </div>
                  )}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="z-50">
            <DropdownMenu onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <span
                  className={cn(
                    "cursor-pointer transition-all pointer-events-auto",
                    isDismissing && "opacity-70"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <SoftSquareIcon
                    size={dotSize}
                    color={categoryColor}
                    isCompleted={reminder.isCompleted}
                    isRecurring={reminder.isRecurring}
                    isVirtualInstance={isVirtualInstance}
                    isDismissing={isDismissing}
                  />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenDetailsModal) {
                      onOpenDetailsModal(reminder);
                    }
                    setIsMenuOpen(false);
                  }}
                >
                  <Info className="h-4 w-4 mr-2 text-gray-600" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  disabled={isDismissing || reminder.isCompleted}
                  className={cn(
                    reminder.isCompleted && "opacity-50 cursor-not-allowed",
                    isDismissing && "bg-gray-100"
                  )}
                >
                  <X className={cn(
                    "h-4 w-4 mr-2",
                    isDismissing ? "text-gray-400" : "text-red-600",
                    reminder.isCompleted && "text-gray-400"
                  )} />
                  {isDismissing ? "Dismissing..." : "Dismiss"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenEditModal) {
                      onOpenEditModal(reminder);
                    }
                    setIsMenuOpen(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2 text-blue-600" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <Trash className="h-4 w-4 mr-2 text-red-600" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog for non-recurring reminders */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the reminder "{reminder.title}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={(e) => e.stopPropagation()}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                await deleteSingleReminder();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recurring Reminder Action Dialog for recurring reminders */}
      <RecurringReminderActionDialog
        isOpen={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        reminderTitle={reminder.title}
        action={currentAction}
        onConfirmSingle={currentAction === 'dismiss' ? dismissSingleReminder : deleteSingleReminder}
        onConfirmAll={currentAction === 'dismiss' ? dismissAllReminders : deleteAllReminders}
        isLoading={currentAction === 'dismiss' ? isDismissing : isDeleting}
      />
    </>
  );
}

// --- Draggable Task Item Component ---
interface DraggableTaskItemProps {
  task: Task;
  compact?: boolean;
  onEdit?: (task: Task) => void;
}

function DraggableTaskItem({ task, compact = false, onEdit }: DraggableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-task-${task.id}`,
    data: { task }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: 0,
    zIndex: -1,
  } : {
    opacity: 1,
    zIndex: 1,
  };

  const taskStyle = {
    borderLeftColor: task.goal?.category?.color || '#808080'
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "text-xs px-1 py-0.5 truncate flex items-center gap-1 w-full",
        'bg-white dark:bg-gray-800 border dark:border-gray-700',
        task.status === TaskStatus.IN_PROGRESS && 'bg-fuchsia-50 dark:bg-fuchsia-950/30', // Subtle magenta tint for in-progress
        task.status === TaskStatus.COMPLETED ? 'bg-stone-100 dark:bg-stone-800/30 opacity-40 text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-300',
        'border-l', // Thinnest left border for small month view cards (1px - half of original 2px)
        'hover:bg-gray-100 dark:hover:bg-gray-700 z-10', // Added hover effect and z-index to ensure tasks remain interactive
        onEdit ? 'cursor-pointer' : 'cursor-default' // Pointer cursor when editing is available
      )}
      style={{
        ...style,
        ...taskStyle
      }}
      title={task.name}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        if (onEdit) {
          onEdit(task);
        }
      }}
    >
      {/* Drag handle - colored dot */}
      <span
        {...listeners}
        {...attributes}
        className={cn(
          "w-3 h-3 rounded-sm flex-shrink-0 cursor-grab hover:cursor-grabbing",
          task.status === TaskStatus.COMPLETED && "opacity-60"
        )}
        style={{
          backgroundColor: task.goal?.category?.color || '#808080',
          opacity: task.status === TaskStatus.COMPLETED ? 0.6 : 1
        }}
        onClick={(e) => e.stopPropagation()} // Prevent click-to-edit when dragging
      ></span>
      <span className="line-clamp-1">{task.name}</span>
    </div>
  );
}

// --- Task Item Overlay Component (for DragOverlay) ---
function TaskItemOverlay({ task }: { task: Task }) {
    const taskStyle = {
      borderLeftColor: task.goal?.category?.color || '#808080'
    };

    return (
        <div
          className={cn(
            "text-xs px-1 py-0.5 truncate flex items-center gap-1.5 cursor-grabbing",
            'bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg ring-2 ring-primary opacity-75',
            task.status === TaskStatus.IN_PROGRESS && 'bg-fuchsia-50 dark:bg-fuchsia-950/30', // Subtle magenta tint for in-progress
            task.status === TaskStatus.COMPLETED ? 'bg-stone-100 dark:bg-stone-800/30 opacity-40 text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-300',
            'border-l' // Thinnest left border for small month view overlay (1px - half of original 2px)
          )}
          style={taskStyle}
          title={task.name}
        >
          <span
            className={cn(
              "w-3 h-3 rounded-sm flex-shrink-0",
              task.status === TaskStatus.COMPLETED && "opacity-60"
            )}
            style={{
              backgroundColor: task.goal?.category?.color || '#808080',
              opacity: task.status === TaskStatus.COMPLETED ? 0.6 : 1
            }}
          ></span>
          <span className="line-clamp-1">{task.name}</span>
        </div>
    );
}

// --- Reminder Item Overlay Component (for DragOverlay) ---
function ReminderItemOverlay({ reminder }: { reminder: Reminder }) {
    // Check if this is a virtual instance
    const isVirtualInstance = 'isVirtualInstance' in reminder && reminder.isVirtualInstance === true;

    // Check if this is a recurring reminder
    const isRecurring = reminder.isRecurring || isVirtualInstance;

    // Get category color for border
    const getCategoryColor = (): string => {
      // If reminder has a direct category with a color
      if (reminder.category && typeof reminder.category === 'object' && reminder.category.color) {
        return reminder.category.color;
      }

      // If reminder has a goal with a category with a color
      if (reminder.goal && typeof reminder.goal === 'object' &&
          reminder.goal.category && typeof reminder.goal.category === 'object' &&
          reminder.goal.category.color) {
        return reminder.goal.category.color;
      }

      // No category color found, use default red
      return '#ef4444';
    };

    const categoryColor = getCategoryColor();

    // Style for the background with category color at 35% opacity and red border
    const reminderStyle = {
      backgroundColor: `${categoryColor}59`, // 35% opacity using hex alpha
      borderColor: '#ef4444',
      borderRadius: '0.375rem' // Match the rounded class
    };

    return (
        <div
          className={cn(
            "text-xs px-1 py-0.5 rounded truncate flex items-center gap-1.5 cursor-grabbing",
            'text-red-700 border shadow-lg',
            isVirtualInstance ? 'border-dashed' : ''
          )}
          style={reminderStyle}
          title={`${isVirtualInstance ? 'Recurring ' : ''}Reminder: ${reminder.title}`}
        >
          <SoftSquareIcon
            size={15}
            color={categoryColor}
            isRecurring={isRecurring}
            isVirtualInstance={isVirtualInstance}
          />
          <span className="line-clamp-1">{reminder.title} {isVirtualInstance && '(recurring)'}</span>
        </div>
    );
}

// --- Month View Reminder Item Component ---
interface MonthViewReminderItemProps {
  reminder: Reminder;
  onRefresh?: () => Promise<void>;
  compact?: boolean;
}

function MonthViewReminderItem({ reminder, onRefresh, compact = false }: MonthViewReminderItemProps) {
  // Add state to track dismissal status
  const [isDismissing, setIsDismissing] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const { dismissReminderItem, deleteReminder } = useReminders();


  // Check if this is a virtual instance
  const isVirtualInstance = 'isVirtualInstance' in reminder && reminder.isVirtualInstance === true;

  // Check if this is a recurring reminder
  const isRecurring = reminder.isRecurring || isVirtualInstance;

  // Check if the reminder is completed/dismissed
  const isCompleted = reminder.isCompleted;

  // Get category color for border
  const getCategoryColor = (): string => {
    // If reminder has a direct category with a color
    if (reminder.category && typeof reminder.category === 'object' && reminder.category.color) {
      return reminder.category.color;
    }

    // If reminder has a goal with a category with a color
    if (reminder.goal && typeof reminder.goal === 'object' &&
        reminder.goal.category && typeof reminder.goal.category === 'object' &&
        reminder.goal.category.color) {
      return reminder.goal.category.color;
    }

    // No category color found, use default red
    return '#ef4444';
  };

  const categoryColor = getCategoryColor();

  // Make the reminder draggable
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `drag-reminder-${reminder.id}`,
    data: { reminder }
  });

  // Style for the background with category color at 35% opacity and red border
  const baseStyle = {
    backgroundColor: `${categoryColor}59`, // 35% opacity using hex alpha
    borderColor: '#ef4444',
    borderRadius: '0.375rem' // Match the rounded class
  };

  // Apply transform style only when dragging
  const style = transform ? {
    ...baseStyle,
    transform: CSS.Translate.toString(transform),
    opacity: 0,
    zIndex: -1,
  } : baseStyle;

  // Handle dismiss action with visual feedback
  const handleDismiss = async () => {
    // For recurring reminders, show the confirmation dialog
    if (isRecurring) {
      setRecurringDialogOpen(true);
      return;
    }

    // For non-recurring reminders, dismiss directly
    await dismissSingleReminder();
  };

  // Dismiss just this single reminder
  const dismissSingleReminder = async () => {
    setIsDismissing(true);
    try {
      console.log("MonthView ReminderItem: Dismissing single reminder ID:", reminder.id);
      const result = await dismissReminderItem(reminder.id);

      if (result.success) {
        console.log("Reminder dismissed successfully");

        // Refresh the UI
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to dismiss reminder";
        console.error("Error dismissing reminder:", errorMessage);
      }
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    } finally {
      setIsDismissing(false);
      setRecurringDialogOpen(false);
    }
  };

  // Dismiss all occurrences of this recurring reminder
  const dismissAllReminders = async () => {
    setIsDismissing(true);
    try {
      // For virtual instances, we need to get the original reminder ID
      const originalId = isVirtualInstance && reminder.originalReminderId
        ? reminder.originalReminderId
        : reminder.id;

      console.log("MonthView ReminderItem: Dismissing all occurrences of reminder ID:", originalId);
      // Pass true as the second parameter to indicate dismissing all occurrences
      const result = await dismissReminderItem(originalId, true);

      if (result.success) {
        console.log("All reminders dismissed successfully");

        // Refresh the UI
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to dismiss reminders";
        console.error("Error dismissing reminders:", errorMessage);
      }
    } catch (error) {
      console.error("Error dismissing all reminders:", error);
    } finally {
      setIsDismissing(false);
      setRecurringDialogOpen(false);
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "text-xs rounded truncate flex items-center",
          // Apply slightly more compact styling when in compact mode, but keep it functional
          "px-1 py-0.5 gap-1.5",
          compact ? "mb-1" : "",
          'text-red-700 dark:text-red-400 border dark:border-gray-700',
          isVirtualInstance ? 'border-dashed' : '',
          'transition-colors',
          // Add visual feedback for completed/dismissed reminders
          isCompleted && 'opacity-50 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
          // Add visual feedback during dismissal
          isDismissing && 'opacity-70 bg-gray-200 dark:bg-gray-700'
        )}
        title={`${isVirtualInstance ? 'Recurring ' : ''}Reminder: ${reminder.title}${isCompleted ? ' (Completed)' : ''}`}
      >
        {/* Soft square icon as drag handle */}
        <span
          className={cn(
            "mr-1 cursor-grab flex-shrink-0"
          )}
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
        >
          <SoftSquareIcon
            size={15}
            color={categoryColor}
            isCompleted={isCompleted}
            isRecurring={isRecurring}
            isVirtualInstance={isVirtualInstance}
            isDismissing={isDismissing}
          />
        </span>

        {/* Title */}
        <span className={cn(
          "line-clamp-1 flex-grow",
          isCompleted && 'line-through'
        )}>
          {reminder.title} {isVirtualInstance && compact ? '' : isVirtualInstance ? '(recurring)' : ''}
        </span>

        {/* Menu button - always show it for functionality */}
        <ReminderActionMenu
          reminder={reminder}
          onActionComplete={async () => {
            console.log("MonthView ReminderItem: Action completed, refreshing...");
            if (onRefresh) {
              await onRefresh();
            }
          }}
          align="start"
          side="right"
          triggerElement={
            <button
              className={cn(
                "ml-1 p-0.5 rounded-full focus:outline-none",
                isCompleted ? "hover:bg-gray-300 dark:hover:bg-gray-600" : "hover:bg-gray-200 dark:hover:bg-gray-700",
                isDismissing && "opacity-50"
              )}
              onClick={(e) => e.stopPropagation()}
              disabled={isDismissing}
            >
              <MoreVertical className={cn(
                "h-3 w-3",
                isCompleted ? "text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400",
                isDismissing && "text-gray-400"
              )} />
            </button>
          }
        />
      </div>

      {/* Recurring Reminder Action Dialog */}
      <RecurringReminderActionDialog
        isOpen={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        reminderTitle={reminder.title}
        action="dismiss"
        onConfirmSingle={dismissSingleReminder}
        onConfirmAll={dismissAllReminders}
        isLoading={isDismissing}
      />
    </div>
  );
}

// --- Day Items Modal Component ---
interface DayItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: Date | null;
  tasks: Task[];
  goals: Goal[];
  reminders: Reminder[];
  onTaskEdit?: (task: Task) => void;
  onReminderEdit?: (reminder: Reminder) => void;
  onReminderRefresh?: () => Promise<void>;
}

function DayItemsModal({ isOpen, onClose, day, tasks, goals, reminders, onTaskEdit, onReminderEdit, onReminderRefresh }: DayItemsModalProps) {
  // Local state to track task updates for real-time UI updates
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Update local tasks when props change
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Handler for task status changes
  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus, updatedTask: Task) => {
    // Update local state immediately for real-time UI feedback
    setLocalTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  if (!day) return null;

  const formattedDate = format(day, 'EEEE, MMMM d, yyyy');

  // Helper function to get category color for reminders
  const getReminderCategoryColor = (reminder: Reminder): string => {
    // If reminder has a direct category with a color
    if (reminder.category && typeof reminder.category === 'object' && reminder.category.color) {
      return reminder.category.color;
    }

    // If reminder has a goal with a category with a color
    if (reminder.goal && typeof reminder.goal === 'object' &&
        reminder.goal.category && typeof reminder.goal.category === 'object' &&
        reminder.goal.category.color) {
      return reminder.goal.category.color;
    }

    // No category color found, use default red
    return '#ef4444';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1050px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Items for {formattedDate}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Goals Section (if any) */}
          {goals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-purple-700 dark:text-purple-400">Goals ({goals.length})</h3>
              <div className="space-y-2">
                {goals.map(goal => (
                  <div key={goal.id} className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-700 dark:text-purple-400">🎯</span>
                        <span className="font-medium dark:text-white">{goal.name}</span>
                      </div>
                    </div>
                    {goal.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 ml-6">{goal.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-column layout: Tasks (left, wider), Reminders (right, narrower) */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
            {/* Tasks Section */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Tasks ({localTasks.length})</h3>
              {localTasks.length > 0 ? (
                <div className="space-y-2">
                  {localTasks.map(task => (
                    <SimpleTaskItem
                      key={task.id}
                      task={task}
                      goalName={task.goal?.name}
                      onEdit={onTaskEdit || (() => {})}
                      onDelete={() => {}} // No delete functionality in modal
                      onClick={onTaskEdit ? () => onTaskEdit(task) : undefined}
                      onStatusChange={handleTaskStatusChange}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No tasks for this day</p>
              )}
            </div>

            {/* Reminders Section */}
            <div>
              <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Reminders ({reminders.length})</h3>
              {reminders.length > 0 ? (
                <div className="space-y-2">
                  {reminders.map(reminder => {
                    const categoryColor = getReminderCategoryColor(reminder);
                    const isVirtualInstance = 'isVirtualInstance' in reminder && reminder.isVirtualInstance;
                    const isRecurring = reminder.isRecurring || isVirtualInstance;

                    return (
                      <div
                        key={reminder.id}
                        className="p-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        style={{
                          backgroundColor: `${categoryColor}15`, // 15% opacity
                          borderColor: `${categoryColor}40` // 40% opacity
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <SoftSquareIcon
                              size={14}
                              color={categoryColor}
                              isRecurring={isRecurring}
                              isVirtualInstance={isVirtualInstance}
                            />
                            <span className="font-medium dark:text-white">{reminder.title}</span>
                            {isVirtualInstance && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded">Recurring</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {reminder.dueDate && format(new Date(reminder.dueDate), 'h:mm a')}
                            </span>
                            <ReminderActionMenu
                              reminder={reminder}
                              align="end"
                              side="bottom"
                              onActionComplete={onReminderRefresh}
                              onOpenEditModal={onReminderEdit}
                              triggerElement={
                                <button
                                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                </button>
                              }
                            />
                          </div>
                        </div>
                        {reminder.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 ml-6">{reminder.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No reminders for this day</p>
              )}
            </div>
          </div>

          {/* Empty state */}
          {localTasks.length === 0 && goals.length === 0 && reminders.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No items scheduled for this day.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(MonthView);