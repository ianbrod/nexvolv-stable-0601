'use client';

import React, { useState, useTransition, useMemo, useCallback, useRef, useEffect } from 'react';
import { Task, Goal as PrismaGoal, TaskPriority, TaskStatus, Category } from '@prisma/client'; // Import Prisma types

// Define a more complete Goal type that includes the category relationship
type Goal = PrismaGoal & {
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
};
// Import SimpleTaskItem instead of TaskItem
import { SimpleTaskItem } from './SimpleTaskItem';
import { TaskModal } from './TaskModal';
import { KanbanBoard } from './KanbanBoard';
import { deleteTask } from '@/actions/tasks';
import { updateTaskStatus } from '@/actions/updateTaskStatus'; // Keep for bulk actions
import { finalUpdateTaskStatus } from '@/actions/finalUpdateTaskStatus'; // Import for direct status updates
import { updateTaskPriority } from '@/actions/updateTaskPriority'; // Import for bulk priority updates

import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TaskFilters, TaskFilterOptions } from './TaskFilters';
import { SearchBar } from './SearchBar';
import { BulkActionBar } from './BulkActionBar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, List, CheckSquare } from 'lucide-react';
import { VirtualizedTaskList } from './VirtualizedTaskList';
import { useScrollPositionStore } from '@/stores/scrollPositionStore';

interface TaskListWrapperProps {
  tasks: Task[];
  goals: Goal[];
  categories?: Category[]; // Add categories for hierarchical dropdown
  isSelectMode?: boolean;
  searchFilters?: TaskFilterOptions;
  hideSearchAndFilters?: boolean;
  onTaskClick?: (task: Task) => void;
  selectedTaskId?: string | null;
  onClearSelection?: () => void; // Add callback to clear selection from parent
}

export function TaskListWrapper({
  tasks,
  goals,
  categories = [],
  isSelectMode: externalSelectMode,
  searchFilters: externalFilters,
  hideSearchAndFilters = false,
  onTaskClick,
  selectedTaskId,
  onClearSelection
}: TaskListWrapperProps) {
  // Log the status of each task every render for debugging
  React.useEffect(() => {
    console.log('[TaskListWrapper] Rendered with tasks:', tasks.map(t => ({ id: t.id, status: t.status })));
  }, [tasks]);

  const router = useRouter();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [internalSelectMode, setInternalSelectMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);

  // Use external select mode if provided, otherwise use internal state
  const isSelectMode = externalSelectMode !== undefined ? externalSelectMode : internalSelectMode;

  // Clear selection when external select mode is turned off
  React.useEffect(() => {
    if (externalSelectMode === false) {
      setSelectedTasks(new Set());
      setLastSelectedTaskId(null);
      if (onClearSelection) {
        onClearSelection();
      }
    }
  }, [externalSelectMode, onClearSelection]);

  // Clear text selection when in select mode and shift-clicking
  React.useEffect(() => {
    const handleMouseUp = () => {
      if (isSelectMode) {
        // Clear any text selection that might have occurred during shift-click
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
      }
    };

    if (isSelectMode) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isSelectMode]);

  // Add state for filters
  const [internalFilters, setInternalFilters] = useState<TaskFilterOptions>({
    status: null,
    priority: null,
    goalId: null,
    categoryIds: [],
    isOverdue: false,
    searchQuery: '',
    sortBy: 'dueDate',
    sortDirection: 'asc',
  });

  // Use external filters if provided, otherwise use internal state
  const filters = externalFilters || internalFilters;
  const setFilters = externalFilters ? undefined : setInternalFilters;

  // --- Moved Function Declarations ---
  // Function to open the modal for editing - wrapped in useCallback
  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  }, []); // No dependencies needed if it only uses setters

  // Function to confirm task deletion - wrapped in useCallback
  const handleDeleteConfirm = useCallback((taskId: string) => {
    setTaskToDelete(taskId);
    setIsDeleteAlertOpen(true);
  }, []); // No dependencies needed if it only uses setters

  // Function to get goal name by ID - wrapped in useCallback
  const getGoalName = useCallback((goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.name || null;
  }, [goals]); // Dependency on goals prop
  // --- End Moved Function Declarations ---

  // Sort tasks based on selected filters
  const filteredTasks = useMemo(() => {
    // When using external filters, the tasks are already filtered
    // We just need to sort them here
    const sorted = [...tasks].sort((a, b) => {
      const direction = filters.sortDirection === 'asc' ? 1 : -1;

      switch (filters.sortBy) {
        case 'name':
          return (a.name.localeCompare(b.name)) * direction;

        case 'dueDate':
          // Handle null due dates (null values should come last)
          if (a.dueDate === null && b.dueDate === null) return 0;
          if (a.dueDate === null) return 1 * direction;
          if (b.dueDate === null) return -1 * direction;
          return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * direction;

        case 'priority':
          // Convert priority to numeric value for sorting
          const priorityValues = {
            [TaskPriority.LOW]: 1,
            [TaskPriority.MEDIUM]: 2,
            [TaskPriority.HIGH]: 3
          };
          return (priorityValues[a.priority] - priorityValues[b.priority]) * direction;

        case 'createdAt':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;

        default:
          return 0;
      }
    });

    // Return the sorted tasks
    return sorted;
  }, [tasks, filters.sortBy, filters.sortDirection]);

  // Function to handle task selection with range selection support
  const handleTaskSelect = useCallback((taskId: string, isSelected: boolean, isShiftClick: boolean = false) => {
    const newSelectedTasks = new Set(selectedTasks);

    if (isShiftClick && lastSelectedTaskId && lastSelectedTaskId !== taskId) {
      // Handle range selection
      const currentTaskIndex = filteredTasks.findIndex(task => task.id === taskId);
      const lastTaskIndex = filteredTasks.findIndex(task => task.id === lastSelectedTaskId);

      if (currentTaskIndex !== -1 && lastTaskIndex !== -1) {
        // Determine the range
        const startIndex = Math.min(currentTaskIndex, lastTaskIndex);
        const endIndex = Math.max(currentTaskIndex, lastTaskIndex);

        // Select all tasks in the range
        for (let i = startIndex; i <= endIndex; i++) {
          newSelectedTasks.add(filteredTasks[i].id);
        }
      }
    } else {
      // Handle single selection
      if (isSelected) {
        newSelectedTasks.add(taskId);
      } else {
        newSelectedTasks.delete(taskId);
      }
    }

    setSelectedTasks(newSelectedTasks);
    setLastSelectedTaskId(taskId);
  }, [selectedTasks, lastSelectedTaskId, filteredTasks]);

  // State for virtualization
  const [useVirtualization, setUseVirtualization] = useState(true);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get scroll position store functions
  const { saveScrollPosition, getScrollPosition } = useScrollPositionStore();

  // Track if initial scroll position has been restored for non-virtualized list
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);

  // Update container height when the window is resized or component mounts
  useEffect(() => {
    const updateContainerHeight = () => {
      if (containerRef.current) {
        const newHeight = containerRef.current.clientHeight;
        if (newHeight > 0) {
          setContainerHeight(newHeight);
          console.log('[TaskListWrapper] Container height updated:', newHeight);
        }
      }
    };

    // Initial update with a small delay to ensure the DOM is fully rendered
    setTimeout(updateContainerHeight, 0);

    // Add resize event listener
    window.addEventListener('resize', updateContainerHeight);

    // Create a ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateContainerHeight();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Clean up
    return () => {
      window.removeEventListener('resize', updateContainerHeight);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  // Fallback for environments where virtualization might not be supported
  useEffect(() => {
    // Check if we're in a browser environment that supports all required features
    const isSupported = typeof window !== 'undefined' &&
                        'ResizeObserver' in window &&
                        'IntersectionObserver' in window;

    setUseVirtualization(isSupported);
  }, []);

  // Handle scroll events for non-virtualized list
  useEffect(() => {
    if (!useVirtualization && containerRef.current) {
      const handleScroll = () => {
        if (containerRef.current) {
          saveScrollPosition('taskList', containerRef.current.scrollTop);
        }
      };

      // Add scroll event listener
      containerRef.current.addEventListener('scroll', handleScroll);

      // Clean up event listener
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('scroll', handleScroll);
        }
      };
    }
  }, [useVirtualization, saveScrollPosition]);

  // Separate effect for scroll position restoration to ensure it runs after render
  useEffect(() => {
    if (!useVirtualization && containerRef.current && !hasRestoredScroll) {
      // Use setTimeout to ensure the component is fully rendered
      setTimeout(() => {
        const savedScrollPosition = getScrollPosition('taskList');
        if (savedScrollPosition > 0 && containerRef.current) {
          // Use smooth scrolling for better UX
          containerRef.current.scrollTo({
            top: savedScrollPosition,
            behavior: 'smooth'
          });
        }
        setHasRestoredScroll(true);
      }, 100);
    }
  }, [useVirtualization, getScrollPosition, hasRestoredScroll]);

  // Handle keyboard navigation for task list
  const handleKeyDown = useCallback((e: React.KeyboardEvent, taskId: string, index: number) => {
    // Only handle keyboard navigation in non-virtualized mode
    if (useVirtualization) return;

    const taskElements = containerRef.current?.querySelectorAll('[data-task-id]');
    if (!taskElements) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < taskElements.length - 1) {
          (taskElements[index + 1] as HTMLElement).focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          (taskElements[index - 1] as HTMLElement).focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        if (taskElements.length > 0) {
          (taskElements[0] as HTMLElement).focus();
        }
        break;
      case 'End':
        e.preventDefault();
        if (taskElements.length > 0) {
          (taskElements[taskElements.length - 1] as HTMLElement).focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onTaskClick) {
          const task = filteredTasks.find(t => t.id === taskId);
          if (task) {
            onTaskClick(task);
          }
        }
        break;
    }
  }, [useVirtualization, filteredTasks, onTaskClick]);

  // Memoize the rendered list of task items for fallback rendering
  const memoizedTaskItems = useMemo(() => {
    if (useVirtualization) return null; // Don't calculate if using virtualization

    return filteredTasks.map((task, index) => (
      // Key needs to be on the top-level element returned by map
      <div
        key={task.id}
        className="flex items-start gap-2"
        data-task-id={task.id}
        tabIndex={0}
        role="listitem"
        aria-label={`Task: ${task.name}`}
        onKeyDown={(e) => handleKeyDown(e, task.id, index)}
      >
        {/* Selection checkbox - only visible in select mode */}
        {isSelectMode && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const isShiftClick = e.shiftKey;
              const isCurrentlySelected = selectedTasks.has(task.id);
              handleTaskSelect(task.id, !isCurrentlySelected, isShiftClick);
            }}
            onMouseDown={(e) => {
              // Prevent text selection when shift-clicking
              if (e.shiftKey) {
                e.preventDefault();
              }
            }}
            className="mt-4 cursor-pointer"
          >
            <Checkbox
              checked={selectedTasks.has(task.id)}
              onCheckedChange={() => {
                // This will be handled by the onClick above
              }}
              className="pointer-events-none"
            />
          </div>
        )}

        {/* Task Item */}
        <div className={isSelectMode ? 'flex-grow' : 'w-full'}>
          {/* Use SimpleTaskItem instead */}
          <SimpleTaskItem
            task={task}
            goalName={getGoalName(task.goalId)} // Use memoized getGoalName
            onEdit={handleEdit} // Use memoized handleEdit
            onDelete={handleDeleteConfirm} // Use memoized handleDeleteConfirm
            onClick={onTaskClick} // Use potentially external onClick
            isSelected={selectedTaskId === task.id} // Pass active state for glow effect
          />
        </div>
      </div>
    ));
    // Dependencies for the memoized list rendering
  }, [filteredTasks, isSelectMode, selectedTasks, getGoalName, handleEdit, handleDeleteConfirm, onTaskClick, useVirtualization, handleTaskSelect, handleKeyDown, selectedTaskId]);

  // Function to close the modal
  // Function to close the modal - wrapped in useCallback
  const handleCloseModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingTask(null); // Clear editing task when modal closes
  }, []); // No dependencies needed if it only uses setters
  // Removed extra closing brace from previous diff attempt

  // Removed handleTaskStatusChange function (logic moved to useTaskStatus hook in SimpleTaskItem)

  // Function to handle bulk status changes
  const handleBulkStatusChange = async (status: TaskStatus) => {
    if (selectedTasks.size === 0) return;

    startTransition(async () => {
      try {
        console.log(`[TaskListWrapper] Bulk updating ${selectedTasks.size} tasks to status: ${status}`);

        // Create an array of promises for each task update
        const updatePromises = Array.from(selectedTasks).map(taskId => {
          const formData = new FormData();
          formData.append('taskId', taskId);
          formData.append('status', status);
          return updateTaskStatus(formData);
        });

        // Wait for all updates to complete
        const results = await Promise.all(updatePromises);

        // Check if all updates were successful
        const allSuccessful = results.every(result => result.success);

        if (allSuccessful) {
          // Clear selection after successful update
          setSelectedTasks(new Set());

          // Refresh the router
          router.refresh();
        } else {
          console.error('Failed to update some tasks');
          // Could add toast notification here
        }
      } catch (error) {
        console.error('[TaskListWrapper] Error in bulk status change:', error);
        // Handle the error gracefully - don't crash the app
      }
    });
  };

  // Function to handle bulk priority change
  const handleBulkPriorityChange = async (priority: TaskPriority) => {
    if (selectedTasks.size === 0) return;

    startTransition(async () => {
      try {
        console.log(`[TaskListWrapper] Bulk updating ${selectedTasks.size} tasks to priority: ${priority}`);

        // Create an array of promises for each task update
        const updatePromises = Array.from(selectedTasks).map(taskId => {
          // Ensure taskId is valid
          if (!taskId || taskId.trim() === '') {
            console.error(`[TaskListWrapper] Invalid taskId: ${taskId}`);
            return Promise.resolve({ success: false, message: 'Invalid task ID' });
          }

          // Convert priority to string if it's not already
          const priorityStr = typeof priority === 'string' ? priority : priority.toString();

          const formData = new FormData();
          formData.append('taskId', taskId);
          formData.append('priority', priorityStr);

          // Log the form data being sent
          console.log(`[TaskListWrapper] Sending update for task ${taskId} with priority ${priorityStr}`);

          return updateTaskPriority(formData);
        });

        // Wait for all updates to complete
        const results = await Promise.all(updatePromises);

        // Log the results for debugging
        console.log(`[TaskListWrapper] Bulk priority update results:`, results);

        // Check if all updates were successful
        const allSuccessful = results.every(result => result.success);

        if (allSuccessful) {
          // Clear selection after successful update
          setSelectedTasks(new Set());

          // Refresh the router
          router.refresh();
        } else {
          // Log which tasks failed to update
          results.forEach((result, index) => {
            if (!result.success) {
              console.error(`[TaskListWrapper] Failed to update task at index ${index}: ${result.message}`);
            }
          });
          console.error('Failed to update priority for some tasks');
          // Could add toast notification here
        }
      } catch (error) {
        console.error('[TaskListWrapper] Error in bulk priority change:', error);
        // Handle the error gracefully - don't crash the app
      }
    });
  };

  // Function to show bulk delete confirmation
  const showBulkDeleteConfirmation = () => {
    if (selectedTasks.size === 0) return;
    setIsBulkDeleteAlertOpen(true);
  };

  // Function to execute bulk deletion after confirmation
  const executeBulkDelete = async () => {
    if (selectedTasks.size === 0) return;

    startTransition(async () => {
      try {
        console.log(`[TaskListWrapper] Bulk deleting ${selectedTasks.size} tasks`);

        // Create an array of promises for each task deletion
        const deletePromises = Array.from(selectedTasks).map(taskId => {
          return deleteTask(taskId);
        });

        // Wait for all deletions to complete
        const results = await Promise.all(deletePromises);

        // Check if all deletions were successful
        const allSuccessful = results.every(result => result.success);

        if (allSuccessful) {
          // Clear selection after successful deletion
          setSelectedTasks(new Set());

          // Refresh the page to show updated data
          router.refresh();
        } else {
          // Log which tasks failed to delete
          results.forEach((result, index) => {
            if (!result.success) {
              console.error(`[TaskListWrapper] Failed to delete task at index ${index}: ${result.message}`);
            }
          });
          console.error('Failed to delete some tasks');
          // Could add toast notification here
        }
      } catch (error) {
        console.error('[TaskListWrapper] Error in bulk deletion:', error);
        // Handle the error gracefully - don't crash the app
      } finally {
        // Close the confirmation dialog
        setIsBulkDeleteAlertOpen(false);
      }
    });
  };



  // Remove handleCompletionChange - logic is now within SimpleTaskItem
  // const handleCompletionChange = async (taskId: string, completed: boolean) => { ... };

  // Function to execute task deletion
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    startTransition(async () => {
      const result = await deleteTask(taskToDelete);

      if (result.success) {
        router.refresh(); // Refresh the page to show updated data
      } else {
        console.error('Failed to delete task:', result.message);
        // Could add toast notification here
      }

      setIsDeleteAlertOpen(false);
      setTaskToDelete(null);
    });
  };

  // Handle search query changes
  const handleSearch = (query: string) => {
    // Only update internal filters if setFilters is defined (i.e., not using external filters)
    if (setFilters) {
      setFilters(prev => ({
        ...prev,
        searchQuery: query
      }));
    } else {
      // Optional: If using external filters, you might want to propagate the search query up
      // console.warn("Search handled internally, but using external filters. Consider propagating search query.");
    } // Removed erroneous closing braces/parenthesis
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      {/* Search and Filters Section - Only show if not hidden */}
      {!hideSearchAndFilters && (
        <div className="flex-shrink-0 bg-background pt-2 pb-4 border-b mb-6 w-full">
          {/* Search Bar */}
          <div className="mb-4">
            <SearchBar
              onSearch={handleSearch}
              initialQuery={filters.searchQuery || ''}
            />
          </div>

          {/* Task Filters */}
          {setFilters && (
            <TaskFilters
              filters={filters}
              onFilterChange={setFilters}
              goals={goals.map(g => ({ id: g.id, name: g.name, parentGoalId: g.parentGoalId }))}
              categories={goals.reduce((categories, goal) => {
                if (goal.categoryId && goal.category && !categories.some(c => c.id === goal.categoryId)) {
                  categories.push({
                    id: goal.categoryId,
                    name: goal.category.name,
                    color: goal.category.color
                  });
                }
                return categories;
              }, [] as { id: string; name: string; color?: string }[])}
            />
          )}
        </div>
      )}

      {/* Task List Header */}
      <div className="flex-shrink-0 flex justify-between items-center mb-4">
        {/* Task Count Display */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground font-medium">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
            {filteredTasks.length !== tasks.length && (
              <span className="text-xs ml-1">of {tasks.length}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
          {externalSelectMode === undefined && (
          <Button
            variant={isSelectMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setInternalSelectMode(!internalSelectMode);
              if (isSelectMode) {
                // Clear selection and last selected task when exiting select mode
                setSelectedTasks(new Set());
                setLastSelectedTaskId(null);
              }
            }}
            className={isSelectMode ? 'bg-primary text-primary-foreground font-medium' : 'border-2 border-primary/50 hover:bg-primary/10'}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            {isSelectMode ? 'Exit Selection' : 'Select Tasks'}
          </Button>
          )}

          {/* Select/Deselect All button - only visible in select mode */}
          {isSelectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // If all visible tasks are already selected, deselect all
                // Otherwise, select all visible tasks
                const allTaskIds = filteredTasks.map(task => task.id);
                const allSelected = allTaskIds.every(id => selectedTasks.has(id));

                if (allSelected) {
                  // Deselect all
                  setSelectedTasks(new Set());
                  setLastSelectedTaskId(null);
                } else {
                  // Select all visible tasks
                  setSelectedTasks(new Set(allTaskIds));
                  setLastSelectedTaskId(allTaskIds[allTaskIds.length - 1] || null);
                }
              }}
              className="border-primary/50 hover:bg-primary/10"
              disabled={filteredTasks.length === 0}
            >
              {filteredTasks.length > 0 &&
               filteredTasks.every(task => selectedTasks.has(task.id))
                ? "Deselect All"
                : "Select All"}
            </Button>
          )}
          </div>
        </div>
      </div>

      {/* Task List - Render either virtualized list or fallback */}
      <div
        className="flex-grow h-full min-h-[300px] w-full" /* Remove overflow-auto to prevent double scroll bars */
        ref={containerRef}
        tabIndex={!useVirtualization ? 0 : undefined}
        role={!useVirtualization ? 'list' : undefined}
        aria-label={!useVirtualization ? 'Task list' : undefined}
      >
        {tasks.length === 0 && <p className="text-muted-foreground">No active tasks found. Add your first task!</p>}
        {filteredTasks.length === 0 && tasks.length > 0 && (
          <p className="text-muted-foreground">No tasks match the selected filters.</p>
        )}

        {filteredTasks.length > 0 && (
          <>
            {useVirtualization ? (
              /* Enhanced virtualized list with performance optimizations */
              <VirtualizedTaskList
                tasks={filteredTasks}
                isSelectMode={isSelectMode}
                selectedTasks={selectedTasks}
                onTaskSelect={handleTaskSelect}
                getGoalName={getGoalName}
                onEdit={handleEdit}
                onDelete={handleDeleteConfirm}
                onTaskClick={onTaskClick}
                selectedTaskId={selectedTaskId} /* Pass selected task ID for glow effect */
                height={containerHeight} /* Use the state that's updated on resize */
                className="pb-4 h-full"
                useVariableHeights={false} /* Disable variable heights to fix the infinite update loop */
                useScrollingPlaceholder={false} /* DISABLE scrolling placeholder - user finds it annoying */
                scrollingPlaceholderDelay={1000} /* Much longer delay before showing placeholder (if enabled) */
                intensityThreshold={95} /* Only show placeholders during extremely intense scrolling (higher = less frequent) */
                enableWindowingOptimization={filteredTasks.length > 100} /* Enable windowing for large lists */
                enableIntelligentPreloading={filteredTasks.length > 50} /* Enable preloading for medium+ lists */
                preloadBuffer={Math.min(20, Math.ceil(filteredTasks.length * 0.1))} /* Adaptive buffer size */
                overscanCount={filteredTasks.length > 1000 ? 3 : 5} /* Reduce overscan for very large lists */
              />
            ) : (
              /* Fallback for environments where virtualization isn't supported */
              <div className="space-y-1 h-full w-full">
                {memoizedTaskItems}
              </div>
            )}
          </>
        )}
      </div>


      {/* Render the TaskModal conditionally for editing */}
      {editingTask && (
        <TaskModal
          mode="edit"
          isOpen={isEditModalOpen}
          onOpenChange={handleCloseModal} // Close and clear state
          initialData={editingTask} // Pass the task data to prefill the form
          goals={goals}
          categories={categories} // Pass categories for hierarchical dropdown
          key={`edit-${editingTask.id}`} // Ensure modal remounts with new data
        />
      )}

      {/* Single Task Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTasks.size} tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You are about to delete {selectedTasks.size} {selectedTasks.size === 1 ? 'task' : 'tasks'}.
              All selected tasks will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeBulkDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedTasks.size} {selectedTasks.size === 1 ? 'task' : 'tasks'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Bar */}
      <div className="flex-shrink-0">
        <BulkActionBar
          selectedCount={selectedTasks.size}
          onClearSelection={() => setSelectedTasks(new Set())}
          onMarkComplete={() => handleBulkStatusChange(TaskStatus.COMPLETED)}
          onMarkInProgress={() => handleBulkStatusChange(TaskStatus.IN_PROGRESS)}
          onMarkTodo={() => handleBulkStatusChange(TaskStatus.TODO)}
          onSetPriorityLow={() => handleBulkPriorityChange('LOW' as TaskPriority)}
          onSetPriorityMedium={() => handleBulkPriorityChange('MEDIUM' as TaskPriority)}
          onSetPriorityHigh={() => handleBulkPriorityChange('HIGH' as TaskPriority)}
          onDelete={showBulkDeleteConfirmation}
          isPending={isPending}
        />
      </div>
    </div>
  );
}