'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Task, Goal, Reminder } from '@/types';
import { TaskStatus, TaskPriority, Category } from '@prisma/client';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, setHours, setMinutes, setSeconds, setMilliseconds, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

import { ReminderActionMenu } from '@/components/reminders/ReminderActionMenu';
import { ReminderEditModal } from '@/components/reminders/ReminderEditModal';
import { ReminderDetailsModal } from '@/components/reminders/ReminderDetailsModal';
import { RecurringReminderActionDialog } from '@/components/reminders/RecurringReminderActionDialog';
import { UnifiedTaskDetailView } from '@/components/tasks/UnifiedTaskDetailView';
import { useReminders } from '@/contexts/ReminderContext';
import { SoftSquareIcon } from '@/components/ui/soft-square-icon';
import { useTimeSlotSettings } from '@/stores/viewPreferencesStore';
import { TaskModal } from '@/components/tasks/TaskModal';
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
import { Edit, Trash, Info, X, Calendar, Clock, CheckCircle } from 'lucide-react';

interface WeekViewProps {
  tasks: Task[]; // Now directly use this prop
  goals?: Goal[];
  categories?: Category[];
  reminders?: Reminder[]; // Add reminders prop
  currentDate: Date;
  onDayClick?: (date: Date) => void;
  onTaskDrop?: (taskId: string, newDate: Date) => void; // Keep this for calling the container handler
  onTaskReorder?: (taskId: string, hourSlotId: string, newOrder: string[]) => void; // Updated to pass the full new order
  taskOrderBySlot?: Record<string, string[]>; // Shared task order state from parent
  onReminderRefresh?: () => Promise<void>; // Add callback for refreshing reminders after actions
}

// Removed local tasks state - component now uses the tasks prop directly
export function WeekView({ tasks, goals: originalGoals = [], categories = [], reminders = [], currentDate, onDayClick, onTaskDrop, onTaskReorder, taskOrderBySlot: externalTaskOrderBySlot = {}, onReminderRefresh }: WeekViewProps) {
  const goals = originalGoals;
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  // Use local state for task ordering if no external state is provided
  const [localTaskOrderBySlot, setLocalTaskOrderBySlot] = useState<Record<string, string[]>>({});

  // Get time slot settings from store
  const { timeSlotStartHour, timeSlotEndHour } = useTimeSlotSettings();

  // Calculate the number of time slots (handle wrap-around)
  const timeSlotCount = timeSlotEndHour >= timeSlotStartHour
    ? timeSlotEndHour - timeSlotStartHour + 1
    : (24 - timeSlotStartHour) + timeSlotEndHour + 1;

  // State for reminder modals
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // State for task editing modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isTaskEditModalOpen, setIsTaskEditModalOpen] = useState(false);

  // Use external task order state if provided, otherwise use local state
  const taskOrderBySlot = externalTaskOrderBySlot || localTaskOrderBySlot;

  // Function to update task order that works with both local and external state
  const updateTaskOrder = (slotId: string, newOrder: string[]) => {
    if (onTaskReorder) {
      // If external handler is provided, use it
      onTaskReorder(newOrder[0], slotId, newOrder);
    } else {
      // Otherwise update local state
      setLocalTaskOrderBySlot(prev => ({
        ...prev,
        [slotId]: newOrder
      }));
    }
  };

  // Removed useEffect for setTasks as local state is removed

  const handleGoalClick = (goal: Goal) => setSelectedGoal(goal);
  const closeGoalDialog = () => setSelectedGoal(null);

  // Task editing handlers
  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskEditModalOpen(true);
  };

  const handleTaskEditModalClose = () => {
    setIsTaskEditModalOpen(false);
    setEditingTask(null);
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  const weekDays = getWeekDays();
  const today = new Date();

  // tasksByDayHour now directly depends on the tasks prop and custom ordering
  const tasksByDayHour = useMemo(() => {
    const grouped: Record<string, Record<number, Task[]>> = {};
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {};

      // Handle wrap-around case (e.g., 7 AM to 1 AM next day)
      if (timeSlotEndHour >= timeSlotStartHour) {
        // Normal case: start <= end (e.g., 5 AM to 11 PM)
        for (let hour = timeSlotStartHour; hour <= timeSlotEndHour; hour++) {
          grouped[dayKey][hour] = [];
        }
      } else {
        // Wrap-around case: start > end (e.g., 7 AM to 1 AM)
        // First part: from start hour to 23
        for (let hour = timeSlotStartHour; hour <= 23; hour++) {
          grouped[dayKey][hour] = [];
        }
        // Second part: from 0 to end hour
        for (let hour = 0; hour <= timeSlotEndHour; hour++) {
          grouped[dayKey][hour] = [];
        }
      }
    });

    // First, group tasks by day and hour
    const tasksBySlot: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        try {
          const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
          if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
            const dayKey = format(dueDate, 'yyyy-MM-dd');
            const hour = dueDate.getHours();

            // Check if hour is within our time slot range (handle wrap-around)
            const isInRange = timeSlotEndHour >= timeSlotStartHour
              ? (hour >= timeSlotStartHour && hour <= timeSlotEndHour)
              : (hour >= timeSlotStartHour || hour <= timeSlotEndHour);

            if (grouped[dayKey] && isInRange) {
              const slotId = `${dayKey}-${hour}`;
              if (!tasksBySlot[slotId]) tasksBySlot[slotId] = [];
              tasksBySlot[slotId].push(task);
            }
          }
        } catch (e) { console.error("WeekView: Error processing task due date:", e, task); }
      }
    });

    // Then, apply custom ordering and populate the grouped object
    Object.entries(tasksBySlot).forEach(([slotId, slotTasks]) => {
      // Parse the slotId safely
      const parts = slotId.split('-');
      if (parts.length < 2) {
        console.error('Invalid slotId format:', slotId);
        return; // Skip this entry
      }

      // The format should be yyyy-MM-dd-HH, so the hour is the last part
      const hourStr = parts[parts.length - 1];
      // The day key is everything except the last part
      const dayKey = parts.slice(0, parts.length - 1).join('-');

      const hour = parseInt(hourStr, 10);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        console.error('Invalid hour in slotId:', slotId, hourStr);
        return; // Skip this entry
      }

      // Make sure the day exists in our grouped object
      if (!grouped[dayKey]) {
        console.warn('Day not found in grouped object:', dayKey);
        return; // Skip this entry
      }

      // Make sure the hour slot exists
      if (!grouped[dayKey][hour]) {
        grouped[dayKey][hour] = [];
      }

      // Apply custom ordering if available
      if (taskOrderBySlot[slotId]) {
        // Create a map of tasks by ID for quick lookup
        const tasksById = slotTasks.reduce((acc, task) => {
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

        grouped[dayKey][hour] = orderedTasks;
      } else {
        // No custom ordering, use default
        grouped[dayKey][hour] = slotTasks;
      }
    });

    return grouped;
  }, [tasks, weekDays, taskOrderBySlot, timeSlotStartHour, timeSlotEndHour]); // Depend on tasks prop, weekDays, and time slot settings

  const goalsByDay = useMemo(() => goals.reduce((acc, goal) => {
    if (goal.targetCompletionDate) {
      try {
        const deadline = new Date(goal.targetCompletionDate);
        const dayKey = format(deadline, 'yyyy-MM-dd');
        if (deadline >= weekDays[0] && deadline <= weekDays[6]) {
          if (!acc[dayKey]) acc[dayKey] = [];
          acc[dayKey].push(goal);
        }
      } catch (e) { console.error("Error processing goal deadline:", e, goal); }
    }
    return acc;
  }, {} as Record<string, Goal[]>), [goals, weekDays]);

  // Group reminders by day and hour
  const remindersByDayHour = useMemo(() => {
    const grouped: Record<string, Record<number, Reminder[]>> = {};
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {};

      // Handle wrap-around case (e.g., 7 AM to 1 AM next day)
      if (timeSlotEndHour >= timeSlotStartHour) {
        // Normal case: start <= end (e.g., 5 AM to 11 PM)
        for (let hour = timeSlotStartHour; hour <= timeSlotEndHour; hour++) {
          grouped[dayKey][hour] = [];
        }
      } else {
        // Wrap-around case: start > end (e.g., 7 AM to 1 AM)
        // First part: from start hour to 23
        for (let hour = timeSlotStartHour; hour <= 23; hour++) {
          grouped[dayKey][hour] = [];
        }
        // Second part: from 0 to end hour
        for (let hour = 0; hour <= timeSlotEndHour; hour++) {
          grouped[dayKey][hour] = [];
        }
      }
    });

    reminders.forEach(reminder => {
      if (reminder.dueDate) {
        try {
          const dueDate = reminder.dueDate instanceof Date ? reminder.dueDate : new Date(reminder.dueDate);
          if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
            const dayKey = format(dueDate, 'yyyy-MM-dd');
            const hour = dueDate.getHours();

            // Check if hour is within our time slot range (handle wrap-around)
            const isInRange = timeSlotEndHour >= timeSlotStartHour
              ? (hour >= timeSlotStartHour && hour <= timeSlotEndHour)
              : (hour >= timeSlotStartHour || hour <= timeSlotEndHour);

            if (grouped[dayKey] && isInRange) {
              if (!grouped[dayKey][hour]) grouped[dayKey][hour] = [];
              grouped[dayKey][hour].push(reminder);
            }
          }
        } catch (e) { console.error("WeekView: Error processing reminder due date:", e, reminder); }
      }
    });

    return grouped;
  }, [reminders, weekDays, timeSlotStartHour, timeSlotEndHour]);

  // --- DND Handlers ---
   const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id.toString().replace('drag-', '');
    // Find task from the tasks prop
    const task = tasks.find(t => t.id === taskId);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id.toString().replace('drag-', '');
    const activeTaskId = taskId;

    // Case 1: Dropping on an hour slot (changing date/time)
    if (over.id.toString().startsWith('drop-')) {
      const dropData = over.id.toString().replace('drop-', '').split('-');
      const dayStr = `${dropData[0]}-${dropData[1]}-${dropData[2]}`;
      const hour = parseInt(dropData[3], 10);

      // Find task from the tasks prop
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1 || isNaN(hour)) return;

      const originalTask = tasks[taskIndex];
      let newDate = parse(dayStr, 'yyyy-MM-dd', new Date());

      const originalDueDate = originalTask.dueDate ? (originalTask.dueDate instanceof Date ? originalTask.dueDate : new Date(originalTask.dueDate)) : new Date();
      const originalMinutes = originalDueDate.getMinutes();
      const originalSeconds = originalDueDate.getSeconds();
      const originalMilliseconds = originalDueDate.getMilliseconds();

      newDate = setHours(newDate, hour);
      newDate = setMinutes(newDate, originalMinutes);
      newDate = setSeconds(newDate, originalSeconds);
      newDate = setMilliseconds(newDate, originalMilliseconds);

      // Call the onTaskDrop prop to trigger the update in the parent
      if (onTaskDrop) {
        onTaskDrop(taskId, newDate);
      }
      return;
    }

    // Case 2: Dropping on another task (reordering within the same hour slot)
    if (over.id.toString().startsWith('drag-')) {
      const overTaskId = over.id.toString().replace('drag-', '');

      // Find both tasks
      const activeTask = tasks.find(t => t.id === activeTaskId);
      const overTask = tasks.find(t => t.id === overTaskId);

      if (!activeTask || !overTask || !activeTask.dueDate || !overTask.dueDate) return;

      // Check if they're in the same hour slot
      const activeDueDate = new Date(activeTask.dueDate);
      const overDueDate = new Date(overTask.dueDate);

      // Format the dates consistently
      const activeDayKey = format(activeDueDate, 'yyyy-MM-dd');
      const activeHour = activeDueDate.getHours();
      // Check if hour is within valid range (handle wrap-around)
      const isActiveHourInRange = timeSlotEndHour >= timeSlotStartHour
        ? (activeHour >= timeSlotStartHour && activeHour <= timeSlotEndHour)
        : (activeHour >= timeSlotStartHour || activeHour <= timeSlotEndHour);

      const normalizedActiveHour = isActiveHourInRange ? activeHour : timeSlotStartHour;
      const activeSlotId = `${activeDayKey}-${normalizedActiveHour}`;

      const overDayKey = format(overDueDate, 'yyyy-MM-dd');
      const overHour = overDueDate.getHours();

      // Check if hour is within valid range (handle wrap-around)
      const isOverHourInRange = timeSlotEndHour >= timeSlotStartHour
        ? (overHour >= timeSlotStartHour && overHour <= timeSlotEndHour)
        : (overHour >= timeSlotStartHour || overHour <= timeSlotEndHour);

      const normalizedOverHour = isOverHourInRange ? overHour : timeSlotStartHour;
      const overSlotId = `${overDayKey}-${normalizedOverHour}`;

      // Only reorder if they're in the same slot
      if (activeSlotId === overSlotId) {
        // Get all tasks in this slot
        const slotTasks = tasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          const dayKey = format(dueDate, 'yyyy-MM-dd');
          const hour = dueDate.getHours();

          // Check if hour is within valid range (handle wrap-around)
          const isHourInRange = timeSlotEndHour >= timeSlotStartHour
            ? (hour >= timeSlotStartHour && hour <= timeSlotEndHour)
            : (hour >= timeSlotStartHour || hour <= timeSlotEndHour);

          const normalizedHour = isHourInRange ? hour : timeSlotStartHour;
          return `${dayKey}-${normalizedHour}` === activeSlotId;
        });

        // Get current order or create new order
        let currentOrder = taskOrderBySlot[activeSlotId] || slotTasks.map(t => t.id);

        // Find indices
        const fromIndex = currentOrder.indexOf(activeTaskId);
        const toIndex = currentOrder.indexOf(overTaskId);

        if (fromIndex !== -1 && toIndex !== -1) {
          // Create new order by moving the task
          const newOrder = [...currentOrder];
          newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, activeTaskId);

          // Update the task order using the common function
          updateTaskOrder(activeSlotId, newOrder);
        }
      }
    }
  };

  // --- Render ---
  return (
    <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
    >
      <TooltipProvider delayDuration={300}>
        <div data-testid="weekly-timeline" className="h-full flex flex-col">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-0 text-center text-sm font-bold text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 pb-0.5 mb-0.5" style={{ gridTemplateColumns: '40px repeat(7, 1fr)', height: '32px' }}>
            <div className="text-left pl-1 col-span-1 flex items-center h-full" style={{ width: '40px', minWidth: '40px' }}>Time</div>
            {weekDays.map(day => (
              <div key={format(day, 'yyyy-MM-dd')} className={cn(
                "flex items-center justify-center font-bold",
                isSameDay(day, today) && 'font-extrabold text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30 rounded-md px-2 py-1 shadow-sm',
                (format(day, 'E') === 'Sat' || format(day, 'E') === 'Sun') && 'dark:text-gray-500'
              )}>
                {isSameDay(day, today) ? (
                  <>
                    <span className="text-purple-500 dark:text-purple-400">{format(day, 'EEE')}</span>
                    <span className="ml-1.5 text-purple-600 dark:text-purple-400 font-black text-lg">{format(day, 'd')}</span>
                  </>
                ) : (
                  <span>{format(day, 'EEE d')}</span>
                )}
              </div>
            ))}
          </div>

          {/* Timeline Grid */}
          <div className="grid grid-cols-8 gap-0 flex-grow" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
            {/* Time slots column */}
            <div className="relative h-full border-r border-gray-100 dark:border-gray-800 col-span-1">
              {Array.from({ length: timeSlotCount }).map((_, i) => {
                // Calculate hour based on wrap-around logic
                let hour;
                if (timeSlotEndHour >= timeSlotStartHour) {
                  // Normal case: start <= end
                  hour = timeSlotStartHour + i;
                } else {
                  // Wrap-around case: start > end
                  if (i < (24 - timeSlotStartHour)) {
                    // First part: from start hour to 23
                    hour = timeSlotStartHour + i;
                  } else {
                    // Second part: from 0 to end hour
                    hour = i - (24 - timeSlotStartHour);
                  }
                }
                const now = new Date();
                const currentHour = now.getHours();
                const isCurrentHour = hour === currentHour;

                return (
                  <div
                    key={i}
                    className={cn(
                      "text-xs border-t border-gray-100 dark:border-gray-800 flex items-center",
                      isCurrentHour
                        ? "text-primary font-semibold dark:text-primary"
                        : "text-gray-500 dark:text-gray-600"
                    )}
                    style={{
                      height: `calc(100% / ${timeSlotCount})`,
                      backgroundColor: isCurrentHour ? 'rgba(147, 51, 234, 0.4)' : undefined
                    }}
                  >
                    <div
                      className="w-full flex justify-end pr-1 relative"
                    >
                      <span className={cn(
                        "text-right",
                        isCurrentHour && "font-semibold text-gray-900 dark:text-white"
                      )}>{hour % 12 === 0 ? 12 : hour % 12}</span>
                      <span className={cn(
                        "text-[8px] uppercase ml-0.5 self-center",
                        isCurrentHour && "font-bold text-gray-900 dark:text-white"
                      )}>{hour < 12 ? 'AM' : 'PM'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Day columns - Fixed width to prevent widening */}
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayGoals = goalsByDay[dayKey] || [];
              return (
                <div key={dayKey} className={cn("border-l first:border-l-0 border-gray-100 dark:border-gray-900 h-full relative w-full min-w-0",
                  isSameDay(day, today) && "bg-primary/8 border border-purple-500/65 dark:bg-primary/5 dark:border-purple-500/65",
                  (format(day, 'E') === 'Sat' || format(day, 'E') === 'Sun') && "bg-gray-50/80 dark:bg-gray-900/60")}>
                  {/* Droppable Hour Slots */}
                  {Array.from({ length: timeSlotCount }).map((_, i) => {
                    // Calculate hour based on wrap-around logic
                    let hour;
                    if (timeSlotEndHour >= timeSlotStartHour) {
                      // Normal case: start <= end
                      hour = timeSlotStartHour + i;
                    } else {
                      // Wrap-around case: start > end
                      if (i < (24 - timeSlotStartHour)) {
                        // First part: from start hour to 23
                        hour = timeSlotStartHour + i;
                      } else {
                        // Second part: from 0 to end hour
                        hour = i - (24 - timeSlotStartHour);
                      }
                    }
                    const slotId = `drop-${dayKey}-${hour}`;
                    const tasksInSlot = tasksByDayHour[dayKey]?.[hour] || [];
                    const remindersInSlot = remindersByDayHour[dayKey]?.[hour] || [];
                    return (
                      <DroppableHourSlot
                        key={slotId}
                        id={slotId}
                        day={day}
                        hour={hour}
                        timeSlotCount={timeSlotCount}
                        onDayClick={onDayClick}
                        tasksInSlot={tasksInSlot}
                        remindersInSlot={remindersInSlot}
                        onReminderRefresh={onReminderRefresh}
                        onOpenEditModal={(reminder) => {
                          setActiveReminder(reminder);
                          setEditModalOpen(true);
                        }}
                        onOpenDetailsModal={(reminder) => {
                          setActiveReminder(reminder);
                          setDetailsModalOpen(true);
                        }}
                        onTaskEdit={handleTaskEdit}
                      />
                    );
                  })}
                  {/* Goal Deadlines */}
                  {dayGoals.map(goal => {
                    let hour = 8, minute = 0;
                    try { if (goal.targetCompletionDate) { const d = new Date(goal.targetCompletionDate); if (!isNaN(d.getTime())) { hour = d.getHours(); minute = d.getMinutes(); } } } catch (e) { console.log('Error parsing goal due date:', e); }
                    // Check if hour is within our time slot range (handle wrap-around)
                    const isInRange = timeSlotEndHour >= timeSlotStartHour
                      ? (hour >= timeSlotStartHour && hour <= timeSlotEndHour)
                      : (hour >= timeSlotStartHour || hour <= timeSlotEndHour);

                    if (!isInRange) return null;

                    // Calculate position index for wrap-around
                    let positionIndex;
                    if (timeSlotEndHour >= timeSlotStartHour) {
                      // Normal case
                      positionIndex = hour - timeSlotStartHour;
                    } else {
                      // Wrap-around case
                      if (hour >= timeSlotStartHour) {
                        // First part: from start hour to 23
                        positionIndex = hour - timeSlotStartHour;
                      } else {
                        // Second part: from 0 to end hour
                        positionIndex = (24 - timeSlotStartHour) + hour;
                      }
                    }

                    return (
                      <div key={goal.id} className="text-xs p-1 mb-0 rounded cursor-pointer hover:ring-1 hover:ring-primary transition-all overflow-hidden bg-purple-100 text-purple-700 border-l-2 border-purple-500 w-[calc(100%-8px)] pointer-events-auto absolute"
                           style={{ top: `calc(${positionIndex + (minute / 60)} * (100% / ${timeSlotCount}))`, height: `calc(100% / ${timeSlotCount} - 4px)`, left: '4px', right: '4px', zIndex: 20 }}
                           title={`Goal Deadline: ${goal.name}`} onClick={(e) => { e.stopPropagation(); handleGoalClick(goal); }}
                           onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleGoalClick(goal); } }}
                           tabIndex={0} role="button" aria-label={`Goal Deadline: ${goal.name}`} >
                        <div className="flex items-center justify-between"><span className="truncate text-xs font-medium">🎯 {goal.name}</span></div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Goal Detail Dialog */}
          <Dialog open={selectedGoal !== null} onOpenChange={closeGoalDialog}>
            {selectedGoal && (
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{selectedGoal.name}</DialogTitle>
                  <DialogDescription>{selectedGoal.description || 'No description provided'}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {selectedGoal.targetCompletionDate && (<div className="text-sm"><span className="font-medium">Deadline: </span>{format(new Date(selectedGoal.targetCompletionDate), 'PPP')}</div>)}
                  {selectedGoal.notes && (<div className="text-sm mt-2"><span className="font-medium">Notes: </span><p className="mt-1">{selectedGoal.notes}</p></div>)}
                </div>
              </DialogContent>
            )}
          </Dialog>

          {/* Reminder Modals */}
          {activeReminder && (
            <>
              <ReminderEditModal
                isOpen={editModalOpen}
                onClose={() => {
                  setEditModalOpen(false);
                  setActiveReminder(null);
                  if (onReminderRefresh) onReminderRefresh();
                }}
                reminder={activeReminder}
              />
              <ReminderDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => {
                  setDetailsModalOpen(false);
                  setActiveReminder(null);
                }}
                reminder={activeReminder}
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
        </div>
      </TooltipProvider>
       {/* Add dropAnimation={null} here */}
       <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardOverlay task={activeTask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}


// --- Draggable Week Task Card Component ---
interface DraggableWeekTaskCardProps {
  task: Task;
  index: number;
  totalTasksInSlot: number; // Add this for adaptive sizing
  onEdit: (task: Task) => void; // Add click-to-edit handler
}

function DraggableWeekTaskCard({ task, index, totalTasksInSlot, onEdit }: DraggableWeekTaskCardProps) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `drag-${task.id}`,
    data: { task, type: 'task-card' },
  });

  // Also make the task card a drop target for reordering
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `drag-${task.id}`, // Same ID as draggable to identify it
    data: { task, type: 'task-card' },
  });

  // Combine the refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

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

  // Adaptive sizing logic for Task 3.2 - properly constrained cards with scalable units
  const getCardHeight = () => {
    if (totalTasksInSlot === 1) {
      return 'h-[1.75rem]'; // Single task - scalable equivalent of 28px
    } else if (totalTasksInSlot === 2) {
      return 'h-[1.75rem]'; // Two tasks - scalable equivalent of 28px
    } else if (totalTasksInSlot >= 3 && totalTasksInSlot <= 4) {
      // For 3-4 tasks in 2x2 grid: more compact height to fit in cells
      return 'h-[0.75rem]'; // Grid cards - scalable equivalent of 12px
    } else {
      // For 5+ tasks: first 4 in grid, rest compact
      if (index < 4) {
        return 'h-[0.75rem]'; // Grid cards - scalable equivalent of 12px
      } else {
        return 'h-[0.625rem]'; // Additional tasks - scalable equivalent of 10px
      }
    }
  };

  const cardHeight = getCardHeight();

  // Adaptive styling based on task count and position with scalable units
  const getTextSize = () => {
    if (totalTasksInSlot === 2) {
      return 'text-[0.625rem]'; // Smaller text for two tasks - scalable equivalent of 10px
    } else if (totalTasksInSlot >= 3 && totalTasksInSlot <= 4) {
      return 'text-[0.5rem]'; // Very small text for 2x2 grid - scalable equivalent of 8px
    } else if (totalTasksInSlot >= 5) {
      if (index < 4) {
        return 'text-[0.5rem]'; // Very small text for 2x2 grid when 5+ tasks - scalable equivalent of 8px
      } else {
        return 'text-[0.5625rem]'; // Small text for additional tasks - scalable equivalent of 9px
      }
    }
    return 'text-xs'; // Normal text for single task (0.75rem)
  };

  const getDotSize = () => {
    if (totalTasksInSlot === 2) {
      return 'w-[0.5rem] h-[0.5rem]'; // Smaller dot for two tasks - scalable equivalent of 8px
    } else if (totalTasksInSlot >= 3 && totalTasksInSlot <= 4) {
      return 'w-[0.375rem] h-[0.375rem]'; // Small dot for 2x2 grid - scalable equivalent of 6px
    } else if (totalTasksInSlot >= 5) {
      if (index < 4) {
        return 'w-[0.25rem] h-[0.25rem]'; // Tiny dot for 2x2 grid when 5+ tasks - scalable equivalent of 4px
      } else {
        return 'w-[0.375rem] h-[0.375rem]'; // Small dot for additional tasks - scalable equivalent of 6px
      }
    }
    return 'w-[0.625rem] h-[0.625rem]'; // Normal dot size for single task - scalable equivalent of 10px
  };

  const getGap = () => {
    if (totalTasksInSlot >= 3 && totalTasksInSlot <= 4) {
      return 'gap-0.5'; // Minimal gap for 2x2 grid
    } else if (totalTasksInSlot >= 5) {
      if (index < 4) {
        return 'gap-0.5'; // Minimal gap for 2x2 grid when 5+ tasks
      } else {
        return 'gap-1'; // Small gap for additional tasks
      }
    } else if (totalTasksInSlot >= 2) {
      return 'gap-1'; // Smaller gap for multiple tasks
    }
    return 'gap-1.5'; // Normal gap for single task
  };

  const getPadding = () => {
    if (totalTasksInSlot === 2) {
      return 'px-1.5 py-0.5'; // Reduced top/bottom padding for two tasks
    } else if (totalTasksInSlot >= 3 && totalTasksInSlot <= 4) {
      return 'px-1 py-0'; // More compact padding for 2x2 grid to fit in cells
    } else if (totalTasksInSlot >= 5) {
      if (index < 4) {
        return 'px-1 py-0'; // Compact horizontal padding, minimal vertical for 2x2 grid when 5+ tasks
      } else {
        return 'px-1 py-0'; // Compact padding for additional tasks
      }
    }
    return 'px-1.5 py-0.5'; // Normal padding
  };

  // Get border and corner styling based on task count
  const getBorderAndCorners = () => {
    if (totalTasksInSlot >= 3) {
      // Small cards: thinnest border, hard edges
      return 'border-l'; // Thinnest border for small cards (1px - half of original 2px)
    } else if (totalTasksInSlot === 2) {
      // Medium cards: thicker border, hard edges
      return 'border-l-4'; // Thicker border for medium cards
    } else {
      // Single cards: thickest border, hard edges
      return 'border-l-8'; // Thickest border for full size cards (8px - 2x from original 4px)
    }
  };

  const getWidthClass = () => {
    // Let the grid handle the width for small cards, full width for others
    return 'w-full';
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        getTextSize(), getPadding(), "truncate flex items-center font-medium cursor-pointer relative",
        getGap(),
        cardHeight, // Apply adaptive height
        getWidthClass(), // Apply width based on task count
        getBorderAndCorners(), // Apply border thickness and corners
        totalTasksInSlot > 1 && index < totalTasksInSlot - 1 && 'mb-0.5', // Smaller margin between cards when multiple
        'bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-sm',
        task.status === TaskStatus.IN_PROGRESS && 'bg-fuchsia-50 dark:bg-fuchsia-950/30', // Subtle magenta tint for in-progress
        task.status === TaskStatus.COMPLETED ? 'bg-stone-100 dark:bg-stone-800/30 opacity-40 text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100',
        'hover:bg-gray-50 dark:hover:bg-gray-700 z-10 hover:shadow-md transition-all duration-200', // Better hover effect
        // Add a highlight effect when being dragged over
        isOver && 'ring-2 ring-primary ring-offset-1'
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
        onEdit(task);
      }}
    >
      {/* Drag handle - colored dot for single tasks */}
      {totalTasksInSlot === 1 && (
        <span
          {...listeners}
          {...attributes}
          className={cn(
            getDotSize(), "rounded flex-shrink-0 cursor-grab hover:cursor-grabbing",
            task.status === TaskStatus.COMPLETED && "opacity-60"
          )}
          style={{
            backgroundColor: task.goal?.category?.color || '#808080',
            opacity: task.status === TaskStatus.COMPLETED ? 0.6 : 1
          }}
          onClick={(e) => e.stopPropagation()} // Prevent click-to-edit when dragging
        ></span>
      )}

      {/* Drag handle - left border area for multi-task cards */}
      {totalTasksInSlot >= 2 && (
        <div
          {...listeners}
          {...attributes}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-grab hover:cursor-grabbing z-10"
          style={{
            backgroundColor: task.goal?.category?.color || '#808080',
            opacity: task.status === TaskStatus.COMPLETED ? 0.6 : 1
          }}
          onClick={(e) => e.stopPropagation()} // Prevent click-to-edit when dragging
        />
      )}

      <span className="line-clamp-1">{task.name}</span>
    </div>
  );
}

// --- Task Card Overlay Component (for DragOverlay) ---
function TaskCardOverlay({ task }: { task: Task }) {
    const taskStyle = {
      borderLeftColor: task.goal?.category?.color || '#808080'
    };

    return (
        <div
          className={cn(
            "text-xs px-1.5 py-0.5 truncate flex items-center gap-1.5 cursor-grabbing font-medium",
            'bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg ring-2 ring-primary opacity-75',
            task.status === TaskStatus.IN_PROGRESS && 'bg-fuchsia-50 dark:bg-fuchsia-950/30', // Subtle magenta tint for in-progress
            task.status === TaskStatus.COMPLETED ? 'bg-stone-100 dark:bg-stone-800/30 opacity-40 text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100',
            'border-l-8' // Thickest left border with hard edges for overlay
          )}
          style={taskStyle}
          title={task.name}
        >
          <span
            className={cn(
              "w-2.5 h-2.5 rounded flex-shrink-0",
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

// --- Reminder Dot Component ---
interface ReminderDotProps {
  reminder: Reminder;
  index: number;
  onRefresh?: () => Promise<void>;
  onOpenEditModal?: (reminder: Reminder) => void;
  onOpenDetailsModal?: (reminder: Reminder) => void;
}

function ReminderDot({ reminder, index, onRefresh, onOpenEditModal, onOpenDetailsModal }: ReminderDotProps) {
  const dotSize = 20; // Keep as number for SoftSquareIcon, but will scale with rem-based container

  const { deleteReminder, dismissReminderItem } = useReminders();

  // Check if this is a virtual instance
  const isVirtualInstance = 'isVirtualInstance' in reminder && reminder.isVirtualInstance === true;

  // Check if this is a recurring reminder
  const isRecurring = reminder.isRecurring || isVirtualInstance;

  // Get category color for border
  const getCategoryColor = (): string => {
    // If reminder has a direct category with a color
    if (reminder.category && typeof reminder.category === 'object' && 'color' in reminder.category) {
      return reminder.category.color as string;
    }

    // If reminder has a goal with a category with a color
    if (reminder.goal && typeof reminder.goal === 'object' &&
        reminder.goal.category && typeof reminder.goal.category === 'object' &&
        'color' in reminder.goal.category) {
      return reminder.goal.category.color as string;
    }

    // No category color found
    return '';
  };

  const categoryColor = getCategoryColor();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'dismiss' | 'delete'>('dismiss');

  // Handle delete action
  const handleDelete = async () => {
    // For recurring reminders, show the confirmation dialog
    if (isRecurring) {
      setCurrentAction('delete');
      setRecurringDialogOpen(true);
      return;
    }

    // For non-recurring reminders, show the regular delete dialog
    setIsDeleteDialogOpen(true);
  };

  // Delete just this single reminder
  const deleteSingleReminder = async () => {
    setIsDeleting(true);
    try {
      console.log("WeekView ReminderDot: Deleting single reminder ID:", reminder.id);
      const result = await deleteReminder(reminder.id);

      if (result.success) {
        console.log("Reminder deleted successfully");

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
      setIsMenuOpen(false);
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

      console.log("WeekView ReminderDot: Deleting all occurrences of reminder ID:", originalId);
      const result = await deleteReminder(originalId);

      if (result.success) {
        console.log("All reminders deleted successfully");
        if (onRefresh) await onRefresh();
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to delete reminders";
        console.error("Error deleting reminders:", errorMessage);
      }
    } catch (error) {
      console.error("Error deleting all reminders:", error);
    } finally {
      setIsDeleting(false);
      setRecurringDialogOpen(false);
      setIsMenuOpen(false);
    }
  };

  // Handle dismiss action
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

  // Dismiss just this single reminder
  const dismissSingleReminder = async () => {
    setIsDismissing(true);
    try {
      console.log("WeekView ReminderDot: Dismissing single reminder ID:", reminder.id);
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
      setIsMenuOpen(false);
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

      console.log("WeekView ReminderDot: Dismissing all occurrences of reminder ID:", originalId);
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
      setIsMenuOpen(false);
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
              <div className="flex flex-col gap-2 text-sm p-0 max-w-xs bg-card rounded-md">
                <div
                  className="p-3 rounded-t-md border-b border-slate-200 dark:border-slate-700"
                  style={{
                    backgroundColor: categoryColor ? `${categoryColor}20` : undefined, // 20% opacity
                    borderTopColor: categoryColor || undefined
                  }}
                >
                  <h4 className={cn(
                    "font-semibold text-base text-slate-900 dark:text-white",
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
                <div className="p-3">

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={cn(
                      "text-xs px-2 py-0.5 font-normal",
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
                        "text-xs px-2 py-0.5 font-normal bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                        reminder.isCompleted && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      Recurring: {reminder.recurrence}
                    </Badge>
                  )}

                  {('isVirtualInstance' in reminder && reminder.isVirtualInstance) && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-2 py-0.5 font-normal border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400",
                        reminder.isCompleted && "border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                      )}
                    >
                      Recurring Instance
                    </Badge>
                  )}

                  {reminder.category && typeof reminder.category === 'object' && reminder.category.name && (
                    <Badge
                      variant="outline"
                      className="text-xs px-2 py-0.5 font-normal"
                      style={{
                        borderColor: getCategoryColor() ? `${getCategoryColor()}80` : undefined,
                        color: getCategoryColor()
                      }}
                    >
                      {reminder.category.name}
                    </Badge>
                  )}
                </div>

                {reminder.dueDate && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Due: {format(new Date(reminder.dueDate), 'MMM d, yyyy h:mm a')}
                  </div>
                )}


                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="z-50"> {/* Add a wrapper with higher z-index */}
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


// --- Droppable Hour Slot Component ---
interface DroppableHourSlotProps {
  id: UniqueIdentifier;
  day: Date;
  hour: number;
  timeSlotCount: number;
  onDayClick?: (date: Date) => void;
  tasksInSlot: Task[];
  remindersInSlot: Reminder[];
  onReminderRefresh?: () => Promise<void>;
  onOpenEditModal?: (reminder: Reminder) => void;
  onOpenDetailsModal?: (reminder: Reminder) => void;
  onTaskEdit: (task: Task) => void; // Add task edit handler
}

function DroppableHourSlot({
  id,
  day,
  hour,
  timeSlotCount,
  onDayClick,
  tasksInSlot,
  remindersInSlot,
  onReminderRefresh,
  onOpenEditModal,
  onOpenDetailsModal,
  onTaskEdit
}: DroppableHourSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: id, data: { day, hour } });
  const now = new Date();
  const currentHour = now.getHours();
  const isCurrentHour = isSameDay(day, now) && hour === currentHour;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-t border-gray-100 dark:border-gray-900 w-full relative flex",
        "hover:bg-accent/15 dark:hover:bg-accent/10 transition-colors duration-150",
        isOver && "bg-primary/20 dark:bg-primary/15 outline-dashed outline-1 outline-primary dark:outline-primary/70"
      )}
      style={{
        height: `calc(100% / ${timeSlotCount})`,
        backgroundColor: isCurrentHour ? 'rgba(147, 51, 234, 0.4)' : undefined,
        color: isCurrentHour ? 'var(--color-foreground)' : undefined
      }}
      onClick={() => onDayClick && onDayClick(day)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDayClick && onDayClick(day); } }}
      tabIndex={0} role="button" aria-label={`Drop target for ${format(day, 'EEEE, MMMM d')} at ${hour}:00`}
    >
      {/* Main task area */}
      <div className="flex-1 flex flex-col px-1 pt-0.5 pb-1 h-full overflow-hidden">
        {/* Task Cards - Adaptive Layout */}
        {tasksInSlot.length <= 2 ? (
          // 1-2 tasks: Single column layout
          tasksInSlot.map((task, index) => (
            <DraggableWeekTaskCard
              key={task.id}
              task={task}
              index={index}
              totalTasksInSlot={tasksInSlot.length}
              onEdit={onTaskEdit}
            />
          ))
        ) : tasksInSlot.length <= 4 ? (
          // 3-4 tasks: 2x2 grid layout
          <div className="grid grid-cols-2 gap-x-0.5 gap-y-0 h-full">
            {tasksInSlot.slice(0, 4).map((task, index) => (
              <DraggableWeekTaskCard
                key={task.id}
                task={task}
                index={index}
                totalTasksInSlot={tasksInSlot.length}
                onEdit={onTaskEdit}
              />
            ))}
          </div>
        ) : (
          // 5+ tasks: Mixed layout - 2x2 grid for first 4, then single column
          <>
            {/* First 4 tasks in 2x2 grid */}
            <div className="grid grid-cols-2 gap-x-0.5 gap-y-0 mb-0.5">
              {tasksInSlot.slice(0, 4).map((task, index) => (
                <DraggableWeekTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  totalTasksInSlot={tasksInSlot.length}
                  onEdit={onTaskEdit}
                />
              ))}
            </div>
            {/* Additional tasks (5+) in single column */}
            {tasksInSlot.slice(4).map((task, index) => (
              <DraggableWeekTaskCard
                key={task.id}
                task={task}
                index={index + 4}
                totalTasksInSlot={tasksInSlot.length}
                onEdit={onTaskEdit}
              />
            ))}
          </>
        )}
      </div>

      {/* Dedicated reminder column (invisible border for seamless appearance) - Task 3.3 */}
      <div className="w-[1.5rem] flex-shrink-0 flex flex-col items-center justify-center pl-[0.125rem] pr-[0.5rem] relative">
        {/* Single reminder per hour (Task 3.4) - only show first reminder */}
        {remindersInSlot.length > 0 && (
          <>
            <ReminderDot
              key={remindersInSlot[0].id}
              reminder={remindersInSlot[0]}
              index={0}
              onRefresh={onReminderRefresh}
              onOpenEditModal={onOpenEditModal}
              onOpenDetailsModal={onOpenDetailsModal}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default React.memo(WeekView);