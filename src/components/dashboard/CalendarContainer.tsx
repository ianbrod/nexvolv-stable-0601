'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { WeekView } from './WeekView';
import { MonthView } from './MonthView';
import { YearView } from './YearView';
import { TaskModal } from '@/components/tasks/TaskModal'; // Import the standard TaskModal
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { Task, Goal, Reminder } from '@/types/index'; // Corrected import path
import { Task as PrismaTask, Goal as PrismaGoal, Category } from '@prisma/client'; // Import Prisma types for callback
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Plus, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useCalendarDisplay } from '@/hooks/useCalendarDisplay'; // Import the custom hook

import { updateTaskDueDate } from '@/actions/updateTaskDueDate'; // Import the new server action
import { getReminders, updateReminder, createReminder } from '@/actions/reminders-prisma'; // Import the reminders actions
import { ReminderProvider, useReminders } from '@/contexts/ReminderContext';
import { useCalendarView, useSetCalendarView, useViewPreferencesStore } from '@/stores/viewPreferencesStore';

type CalendarView = 'week' | 'month' | 'year';
const MemoizedWeekView = React.memo(WeekView);
const MemoizedMonthView = React.memo(MonthView);
const MemoizedYearView = React.memo(YearView);

interface CalendarContainerProps {
  tasks: Task[];
  goals?: Goal[];
  categories?: Category[];
  onAddTask?: () => void;
  onTaskUpdate?: (updatedTask: PrismaTask) => void; // Add prop for updating parent state
}

export function CalendarContainer({ tasks: initialTasks, goals = [], categories = [], onAddTask, onTaskUpdate }: CalendarContainerProps) { // Added onTaskUpdate prop
  // Use the calendar view from the store instead of local state
  const calendarView = useCalendarView();
  const setCalendarView = useSetCalendarView();



  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // Convert goals to PrismaGoal format for TaskModal
  const prismaGoals = goals.map(goal => ({
    ...goal,
    id: goal.id,
    name: goal.name,
    description: goal.description,
    categoryId: goal.categoryId
  })) as PrismaGoal[];
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const router = useRouter(); // Initialize router - Keep for handleSaveTask for now

  // Use state for tasks to allow optimistic updates within children if needed,
  // but rely on parent state update for sync.
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  // Shared state for task ordering across views
  const [taskOrderBySlot, setTaskOrderBySlot] = useState<Record<string, string[]>>({});

  // Get reminders from context
  const { reminders, refreshReminders } = useReminders();

  // Filter tasks and reminders based on showCompleted toggle
  const filteredTasks = showCompleted ? tasks : tasks.filter(task => task.status !== 'COMPLETED');
  const filteredReminders = showCompleted ? reminders : reminders.filter(reminder => !reminder.isCompleted);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);


  const {
    handlePrevious,
    handleNext,
    handleToday,
    headerDateInfo,
  } = useCalendarDisplay({ currentDate, view: calendarView, onDateChange: setCurrentDate });

  const handleAddTask = useCallback(() => {
    if (onAddTask) onAddTask();
    else {
      setSelectedDate(currentDate);
      setIsTaskModalOpen(true);
    }
  }, [onAddTask, currentDate]);

  const handleDayClick = useCallback((date: Date) => {
      setSelectedDate(date);
      setIsTaskModalOpen(true);
  }, []);

  // Handler for when a task is created through the TaskModal
  const handleTaskCreated = (newTask: PrismaTask) => {
    // Add the new task to the local state
    setTasks(prevTasks => [
      ...prevTasks,
      {
        ...newTask,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null
      } as Task
    ]);

    console.log('Task created successfully');
  };

  // handleSaveTask likely needs updating to use a server action too,
  // but focusing on handleTaskDrop for now based on user feedback.
  const handleSaveTask = useCallback(async (newTask: any) => {
    try {
      // TODO: Replace Dexie add with a server action `createTask`
      const taskId = crypto.randomUUID();
      const taskWithId = { ...newTask, id: taskId };
      // await db.tasks.add(taskWithId); // Replace this
      console.warn("handleSaveTask needs to be updated to use a server action instead of Dexie.");
      console.log('Task saved locally, server action needed.');
      router.refresh(); // Refresh after potential local change (though server action is better)
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('There was a problem creating your task.');
    }
  }, [router]);

  // Updated to call the server action and then the parent state update function
  const handleTaskDrop = useCallback(async (taskId: string, newDate: Date) => {
    // Call server action to persist the change.
    const result = await updateTaskDueDate(taskId, newDate);

    if (result.success && result.data) { // Check if update was successful and data returned
      console.log(`Task moved to ${format(newDate, 'MMM d, h:mm a')}.`);
      // Call the callback passed from the parent to update the state directly
      if (onTaskUpdate) {
        // Pass the updated task data (returned from server action) to the parent
        onTaskUpdate(result.data);
      }
      // No longer need router.refresh() here for this specific update
    } else {
      console.error('Error updating task date via server action:', result.message);
      console.error('Error Rescheduling Task:', result.message || 'Could not update the task date on the server.');
      // Consider if reverting optimistic updates in children is needed on error
      // If so, router.refresh() might be the simplest way to reset state
      // router.refresh();
    }
  }, [onTaskUpdate]);

  // Handle reordering tasks within the same hour slot
  const handleTaskReorder = useCallback((taskId: string, hourSlotId: string, newOrder: string[]) => {
    // Update the shared task order state
    setTaskOrderBySlot(prev => ({
      ...prev,
      [hourSlotId]: newOrder
    }));

    console.log('Task order updated within the time slot.');
  }, []);

  // Handle dropping a reminder to reschedule it
  const handleReminderDrop = useCallback(async (reminderId: string, newDate: Date) => {
    try {
      // Check if this is a virtual instance of a recurring reminder
      const isVirtualInstance = reminderId.includes('-');

      // Find the reminder to check if it's recurring
      let reminderToCheck;
      if (isVirtualInstance) {
        const [originalId] = reminderId.split('-');
        reminderToCheck = reminders.find(r => r.id === originalId);
      } else {
        reminderToCheck = reminders.find(r => r.id === reminderId);
      }

      const isRecurring = reminderToCheck?.isRecurring || isVirtualInstance;

      // For recurring reminders, we should ask the user what they want to do
      // For now, we'll implement the "move just this instance" behavior
      // TODO: Add a dialog to ask user preference

      if (isVirtualInstance) {
        // For virtual instances of recurring reminders, we need to:
        // 1. Find the original reminder to get its data
        // 2. Create a new one-off reminder with the new date
        // 3. Add this instance to the excluded instances of the original reminder

        // Find the original reminder in our local state
        const [originalId, instanceNumber] = reminderId.split('-');
        const originalReminder = reminders.find(r => r.id === originalId);

        if (!originalReminder) {
          console.error('Could not find the original recurring reminder.');
          return;
        }

        // First, add this instance to the excluded instances of the original reminder
        let excludedInstances: string[] = [];

        if ('excludedInstances' in originalReminder &&
            typeof originalReminder.excludedInstances === 'string' &&
            originalReminder.excludedInstances) {
          excludedInstances = originalReminder.excludedInstances.split(',').map((id: string) => id.trim());
        }

        // Make sure we're not adding duplicates
        if (!excludedInstances.includes(reminderId)) {
          excludedInstances.push(reminderId);

          try {
            // Update the original reminder with the new excluded instance
            await updateReminder(originalId, {
              excludedInstances: excludedInstances.join(',')
            });
            console.log(`Added ${reminderId} to excluded instances of ${originalId}`);
          } catch (error) {
            console.error("Error updating excluded instances:", error);
            console.warn('Could not update the original reminder, but will still create a new one.');
          }
        }

        // Now create a new one-off reminder based on the original
        const newReminderData = {
          title: originalReminder.title,
          description: originalReminder.description || '',
          dueDate: newDate,
          isRecurring: false, // Make it a one-off reminder
          categoryId: originalReminder.categoryId || undefined,
          goalId: originalReminder.goalId || undefined,
        };

        // Use the imported createReminder function
        const createResult = await createReminder(newReminderData);

        if (createResult.success) {
          console.log(`Recurring reminder instance converted to a one-off reminder on ${format(newDate, 'MMM d, yyyy')}.`);
        } else {
          console.error('Failed to create new reminder from recurring instance.');
        }
      } else if (isRecurring) {
        // For original recurring reminders, we need to:
        // 1. Create a new one-off reminder with the new date
        // 2. Update the original recurring reminder to start from the next occurrence
        // This preserves the recurring sequence while moving this specific instance

        const originalReminder = reminderToCheck;
        if (!originalReminder) {
          console.error('Could not find the original recurring reminder.');
          return;
        }

        // Calculate the next occurrence date for the recurring reminder
        const getNextOccurrenceDate = (currentDate: Date, recurrence: string): Date => {
          const nextDate = new Date(currentDate);
          switch (recurrence) {
            case 'daily':
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(nextDate.getDate() + 7);
              break;
            case 'monthly':
              nextDate.setMonth(nextDate.getMonth() + 1);
              break;
            case 'yearly':
              nextDate.setFullYear(nextDate.getFullYear() + 1);
              break;
            default:
              // If unknown recurrence, just add a day
              nextDate.setDate(nextDate.getDate() + 1);
          }
          return nextDate;
        };

        const nextOccurrenceDate = getNextOccurrenceDate(originalReminder.dueDate, originalReminder.recurrence || 'daily');

        try {
          // Update the original recurring reminder to start from the next occurrence
          await updateReminder(reminderId, {
            dueDate: nextOccurrenceDate
          });
          console.log(`Updated original recurring reminder ${reminderId} to start from next occurrence: ${nextOccurrenceDate}`);

          // Create a new one-off reminder with the moved date
          const newReminderData = {
            title: originalReminder.title,
            description: originalReminder.description || '',
            dueDate: newDate,
            isRecurring: false,
            categoryId: originalReminder.categoryId || undefined,
            goalId: originalReminder.goalId || undefined,
          };

          const createResult = await createReminder(newReminderData);

          if (createResult.success) {
            console.log(`Recurring reminder instance moved to ${format(newDate, 'MMM d, yyyy')}. Recurring sequence continues from ${format(nextOccurrenceDate, 'MMM d, yyyy')}.`);
          } else {
            console.error('Failed to create new reminder from recurring instance.');
          }
        } catch (error) {
          console.error("Error updating recurring reminder:", error);
          console.error('Failed to update the recurring reminder sequence.');
        }
      } else {
        // For regular non-recurring reminders, just update the due date
        const result = await updateReminder(reminderId, { dueDate: newDate });

        if (result.success) {
          console.log(`Reminder moved to ${format(newDate, 'MMM d, yyyy')}.`);
        } else {
          console.error('Error updating reminder date:', result.error);
          console.error('Error Rescheduling Reminder:', result.error || 'Could not update the reminder date.');
        }
      }

      // Refresh reminders to update the UI
      await refreshReminders();
    } catch (error) {
      console.error('Error in handleReminderDrop:', error);
      console.error('An unexpected error occurred while rescheduling the reminder.');
    }
  }, [reminders, refreshReminders]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handlePrevious && handlePrevious(); } break;
        case 'ArrowRight': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleNext && handleNext(); } break;
        case 't': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleToday && handleToday(); } break;
        case 'w': if (e.ctrlKey || e.metaKey) { e.preventDefault(); setCalendarView('week'); } break;
        case 'm': if (e.ctrlKey || e.metaKey) { e.preventDefault(); setCalendarView('month'); } break;
        case 'y': if (e.ctrlKey || e.metaKey) { e.preventDefault(); setCalendarView('year'); } break;
        case 'n': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleAddTask && handleAddTask(); } break;
        case '?': { e.preventDefault(); setIsHelpDialogOpen(true); break; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calendarView, currentDate, setCalendarView, handlePrevious, handleNext, handleToday, handleAddTask]); // Added setCalendarView to dependencies

  const { dayOfMonth, monthYear, dateRange } = headerDateInfo;

  return (
      <Card className="shadow-sm h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Simplified Header */}
      <CardHeader className="flex flex-row items-center justify-between py-0 px-2 border-b h-[30px] flex-shrink-0">
        <div className="flex items-center gap-3 pl-2">
          <div className="text-4xl font-black text-purple-600 dark:text-purple-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">{dayOfMonth}</div>
          <div className="flex flex-col text-sm">
            <span className="font-bold uppercase tracking-wide">{monthYear}</span>
            <span className="text-muted-foreground text-xs">{dateRange}</span>
          </div>
          {/* Show Completed Toggle */}
          <div className="flex items-center space-x-2 ml-4">
            <Switch
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
              className="data-[state=checked]:bg-purple-600 scale-75"
            />
            <Label
              htmlFor="show-completed"
              className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center space-x-1"
            >
              {showCompleted ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              <span>Show Completed</span>
            </Label>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Navigation controls */}
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="icon" onClick={handlePrevious} className="h-6 w-6" aria-label={`Previous ${calendarView}`}><ChevronLeft className="h-3 w-3" /></Button>
            <Button variant="outline" size="sm" onClick={handleToday} className="h-6 text-xs px-2" aria-label="Go to today">Today</Button>
            <Button variant="outline" size="icon" onClick={handleNext} className="h-6 w-6" aria-label={`Next ${calendarView}`}><ChevronRight className="h-3 w-3" /></Button>
          </div>
          {/* View toggle buttons */}
          <div className="flex rounded-md border text-xs">
            <Button
              variant={calendarView === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCalendarView('week')}
              className={`px-2 py-0.5 h-6 ${
                calendarView === 'week'
                  ? 'bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200'
                  : 'hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 dark:hover:bg-purple-400/10'
              }`}
              aria-label="Switch to week view"
              aria-pressed={calendarView === 'week'}
            >
              Week
            </Button>
            <Button
              variant={calendarView === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCalendarView('month')}
              className={`px-2 py-0.5 h-6 ${
                calendarView === 'month'
                  ? 'bg-purple-600/20 hover:bg-purple-600/30 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 border-2 border-purple-600 dark:border-purple-500 text-purple-800 dark:text-purple-200 hover:text-purple-900 dark:hover:text-purple-100'
                  : 'hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 dark:hover:bg-purple-400/10'
              }`}
              aria-label="Switch to month view"
              aria-pressed={calendarView === 'month'}
            >
              Month
            </Button>
            <Button
              variant={calendarView === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCalendarView('year')}
              className={`px-2 py-0.5 h-6 ${
                calendarView === 'year'
                  ? 'bg-purple-800/90 hover:bg-purple-800 dark:bg-purple-700/90 dark:hover:bg-purple-700 border-2 border-purple-800 dark:border-purple-700 text-white'
                  : 'hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 dark:hover:bg-purple-400/10'
              }`}
              aria-label="Switch to year view"
              aria-pressed={calendarView === 'year'}
            >
              Year
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Calendar Content */}
      <CardContent className="flex-1 w-full p-0 relative overflow-hidden min-h-0">
        {/* Pass down the filtered tasks and reminders based on showCompleted toggle */}
        {calendarView === 'week' && <MemoizedWeekView
          tasks={filteredTasks}
          goals={goals}
          categories={categories}
          reminders={filteredReminders}
          currentDate={currentDate}
          onDayClick={handleDayClick}
          onTaskDrop={handleTaskDrop}
          onTaskReorder={handleTaskReorder}
          taskOrderBySlot={taskOrderBySlot}
          onReminderRefresh={refreshReminders}
        />}
        {calendarView === 'month' && <MemoizedMonthView
          tasks={filteredTasks}
          goals={goals}
          categories={categories}
          reminders={filteredReminders}
          currentDate={currentDate}
          onDayClick={handleDayClick}
          onTaskDrop={handleTaskDrop}
          onReminderDrop={handleReminderDrop}
          taskOrderBySlot={taskOrderBySlot}
          onReminderRefresh={refreshReminders}
        />}
        {calendarView === 'year' && <MemoizedYearView tasks={filteredTasks} goals={goals} currentDate={currentDate} />}
      </CardContent>

      {/* Standard Task Modal */}
      <TaskModal
        mode="create"
        isOpen={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        goals={prismaGoals}
        categories={categories}
        initialData={selectedDate ? {
          dueDate: selectedDate
        } as any : undefined}
        onTaskCreated={handleTaskCreated}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        isOpen={isHelpDialogOpen}
        onClose={() => setIsHelpDialogOpen(false)}
      />
    </Card>
  );
}
