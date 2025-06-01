'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTaskViewState, useSetTaskView, useSetShowCompletedTasks } from '@/stores/viewPreferencesStore';
import { Task as PrismaTask, TaskStatus, TaskPriority } from '@prisma/client';
import { TaskListWrapper } from '@/components/tasks/TaskListWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { SimplifiedKanbanBoard } from './SimplifiedKanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Menu, LayoutGrid, CheckSquare, X, Plus, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedTaskAdd } from '@/components/tasks/UnifiedTaskAdd';
import { syncTasks } from '@/lib/sync-tasks';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SearchBar } from '@/components/tasks/SearchBar';
import { TaskFilterOptions } from './TaskFilters';
import { UnifiedTaskDetailView } from './UnifiedTaskDetailView';
import { TaskModal } from './TaskModal';
import { finalUpdateTaskStatus } from '@/actions/finalUpdateTaskStatus';
import { deleteTask } from '@/actions/tasks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { HierarchicalFilterDropdown } from './HierarchicalFilterDropdown';
import { FilterTag } from './FilterTag';
import { SavedFiltersDropdown } from './SavedFiltersDropdown';
// import { applyFilters as applyTaskFilters } from '@/lib/task-filters';

// Define a more complete Task type that includes the goal relationship
type Task = PrismaTask & {
  goal?: {
    id: string;
    name: string;
    categoryId?: string | null;
    category?: {
      id: string;
      name: string;
      color: string;
    } | null;
  } | null;
};

// Note: We're using the Task type from Prisma directly, so we don't need to define a Goal type here

interface TaskViewProps {
  tasks: Task[];
  goals: any[]; // Using any to avoid type conflicts
  categories?: { id: string; name: string; color: string; order?: number }[];
}

export function TaskView({ tasks, goals, categories: initialCategories }: TaskViewProps) {
  const router = useRouter();
  const { taskView, showCompletedTasks } = useTaskViewState();
  const setTaskView = useSetTaskView();
  const setShowCompletedTasks = useSetShowCompletedTasks();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSelectMode, setIsSelectMode] = useState(false);
  // Add state derived from tasks prop to force re-render on prop change
  const [taskCount, setTaskCount] = useState(tasks.length);
  // Add ref to store the clear selection function from TaskListWrapper
  const clearSelectionRef = useRef<(() => void) | null>(null);

  // Add callback to handle clearing selection from TaskListWrapper
  const handleClearSelection = () => {
    // This will be called by TaskListWrapper when selection is cleared
    console.log('[TaskView] Selection cleared by TaskListWrapper');
  };
  // State for the detail panel
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // State for categories - moved to the top to ensure it's initialized before use
  const [categories, setCategories] = useState<{ id: string; name: string; color: string; order?: number }[]>(initialCategories || []);

  // Add state for filters
  const [filters, setFilters] = useState<TaskFilterOptions>({
    status: null,
    priority: null,
    goalId: null,
    goalIds: [], // Array for multi-select goals
    categoryIds: [], // Array for multi-select categories
    isOverdue: false,
    searchQuery: '',
    sortBy: 'dueDate',
    sortDirection: 'asc',
  });

  // Panel width calculations have been removed as they're no longer needed with the sticky approach

  // Apply all filters to tasks
  const applyFilters = (tasksToFilter: Task[]) => {
    // Add direct debugging to understand what's happening
    console.log('DIRECT DEBUG - Filter state:', {
      goalId: filters.goalId,
      categoryIds: filters.categoryIds,
      status: filters.status,
      priority: filters.priority,
      isOverdue: filters.isOverdue
    });

    // Log all tasks and goals for debugging
    console.log('DIRECT DEBUG - All tasks:', tasksToFilter.map(t => ({
      id: t.id,
      name: t.name,
      goalId: t.goalId,
      goal: t.goal ? {
        id: t.goal.id,
        name: t.goal.name,
        categoryId: t.goal.categoryId
      } : null
    })));

    console.log('DIRECT DEBUG - All goals:', goals.map(g => ({
      id: g.id,
      name: g.name,
      categoryId: g.categoryId,
      parentGoalId: g.parentGoalId
    })));

    // Create maps for faster lookups
    const goalCategoryMap = new Map<string, string | null>();
    const goalParentMap = new Map<string, string | null>();

    // Precompute relationships
    goals.forEach(goal => {
      goalCategoryMap.set(goal.id, goal.categoryId);
      goalParentMap.set(goal.id, goal.parentGoalId);
    });

    // Helper function to check if a goal is a descendant of another goal
    const isDescendantOf = (goalId: string | null, ancestorId: string): boolean => {
      if (!goalId) return false;
      if (goalId === ancestorId) return true;

      // Check if it's a direct child
      if (goalParentMap.get(goalId) === ancestorId) return true;

      // Check if it's a descendant at a deeper level
      let currentGoalId = goalParentMap.get(goalId);
      while (currentGoalId) {
        if (currentGoalId === ancestorId) return true;
        currentGoalId = goalParentMap.get(currentGoalId);
      }

      return false;
    };

    // Helper function to get the category of a goal (including parent goals)
    const getGoalCategory = (goalId: string | null): string | null => {
      if (!goalId) return null;

      // Check if this goal has a category
      const directCategory = goalCategoryMap.get(goalId);
      if (directCategory) return directCategory;

      // If not, check parent goals
      let currentGoalId = goalParentMap.get(goalId);
      while (currentGoalId) {
        const parentCategory = goalCategoryMap.get(currentGoalId);
        if (parentCategory) return parentCategory;
        currentGoalId = goalParentMap.get(currentGoalId);
      }

      return null;
    };

    // Filter the tasks
    const result = tasksToFilter.filter(task => {
      // Filter by completed status if needed
      if (!showCompletedTasks && filters.status !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
        return false;
      }

      // Filter by search query
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        const nameMatch = task.name.toLowerCase().includes(query);
        const descMatch = task.description?.toLowerCase().includes(query) || false;
        if (!nameMatch && !descMatch) return false;
      }

      // Handle overdue filter
      if (filters.isOverdue) {
        const now = new Date();
        const isDueAndNotCompleted = task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.COMPLETED;
        if (!isDueAndNotCompleted) return false;
      }

      // Normal status filtering (always apply if status filter is set)
      if (filters.status !== null && task.status !== filters.status) {
        return false;
      }

      // Filter by priority (only if not filtering by overdue)
      if (!filters.isOverdue && filters.priority !== null && task.priority !== filters.priority) {
        return false;
      }

      // Special case: If both goals and categories filters are active
      if ((filters.goalIds.length > 0 || filters.goalId !== null) && filters.categoryIds.length > 0) {
        // Get all selected goals (from both goalId and goalIds)
        const selectedGoalIds = [...filters.goalIds];
        if (filters.goalId !== null && !selectedGoalIds.includes(filters.goalId)) {
          selectedGoalIds.push(filters.goalId);
        }

        // Get the categories of all selected goals
        const selectedGoalCategories = selectedGoalIds.map(goalId => {
          const goal = goals.find(g => g.id === goalId);
          return goal?.categoryId || getGoalCategory(goalId);
        }).filter(Boolean) as string[];

        // Get the task's goal
        const taskGoal = goals.find(g => g.id === task.goalId);

        // Get the task's category (direct or inherited)
        const taskCategory = getGoalCategory(task.goalId);

        // Log special case debugging with more details
        console.log('SPECIAL CASE - Both filters active:', {
          selectedGoalIds,
          selectedGoalCategories,
          selectedCategories: filters.categoryIds,
          taskGoalId: task.goalId,
          taskGoalName: taskGoal?.name,
          taskCategory
        });

        // Check if the task is associated with any of the selected goals
        const isAssociatedWithAnySelectedGoal = selectedGoalIds.some(goalId =>
          isDescendantOf(task.goalId, goalId)
        );

        // Check if the task's category matches any of the selected categories
        const hasCategoryMatch = Boolean(
          taskCategory &&
          filters.categoryIds.includes(taskCategory)
        );

        // We've simplified the logic to just check if the task is associated with a selected goal
        // or if it belongs to a selected category, which handles all cases including when a user
        // selects a goal and then its parent category

        // If the task is associated with a selected goal, it should pass the filter
        // regardless of its category
        if (isAssociatedWithAnySelectedGoal) {
          console.log(`SPECIAL CASE - Task ${task.id} passes because it's associated with a selected goal`);
          return true;
        }

        // If the task's category matches a selected category, it should pass the filter
        if (hasCategoryMatch) {
          console.log(`SPECIAL CASE - Task ${task.id} passes because it belongs to a selected category`);
          return true;
        }

        // If none of the above conditions are met, the task doesn't pass the filter
        console.log(`SPECIAL CASE - Task ${task.id} fails both goal and category filters`);
        return false;
      }

      // Normal case: Apply filters separately
      // Check if we need to apply goal filter
      let passesGoalFilter = true;

      // Get all selected goals (from both goalId and goalIds)
      const selectedGoalIds = [...filters.goalIds];
      if (filters.goalId !== null && !selectedGoalIds.includes(filters.goalId)) {
        selectedGoalIds.push(filters.goalId);
      }

      if (selectedGoalIds.length > 0) {
        // Check if task is directly assigned to any of the selected goals or their subgoals
        passesGoalFilter = selectedGoalIds.some(goalId =>
          isDescendantOf(task.goalId, goalId)
        );
      }

      // Check if we need to apply category filter
      let passesCategoryFilter = true;
      if (filters.categoryIds.length > 0) {
        // Get the category for this task's goal (or its parent goals)
        const taskCategory = getGoalCategory(task.goalId);

        // Check if the task's category matches one of the selected categories
        passesCategoryFilter = Boolean(
          taskCategory &&
          filters.categoryIds.includes(taskCategory)
        );
      }

      // Log detailed information about this task's filtering
      console.log(`DIRECT DEBUG - Task ${task.id} (${task.name}):`, {
        goalId: task.goalId,
        taskCategory: getGoalCategory(task.goalId),
        passesGoalFilter,
        passesCategoryFilter,
        finalResult: passesGoalFilter && passesCategoryFilter
      });

      // The task must pass BOTH filters if both are active
      return passesGoalFilter && passesCategoryFilter;
    });

    // Log the final filtered result
    console.log('DIRECT DEBUG - Filtered tasks:', result.length);

    return result;
  };

  // Helper function to check if a goal is a descendant of another goal
  const isDescendantOf = (goalId: string | null, ancestorId: string): boolean => {
    if (!goalId) return false;
    if (goalId === ancestorId) return true;

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return false;

    // Check if the goal's parent is the ancestor or a descendant of the ancestor
    return goal.parentGoalId ? isDescendantOf(goal.parentGoalId, ancestorId) : false;
  };

  // Helper function to get the category of a goal (or its parent goals)
  const getGoalCategory = (goalId: string | null): string | null => {
    if (!goalId) return null;

    const goal = goals.find(g => g.id === goalId);
    if (!goal) return null;

    // If the goal has a category, return it
    if (goal.categoryId) return goal.categoryId;

    // Otherwise, check the parent goal
    return goal.parentGoalId ? getGoalCategory(goal.parentGoalId) : null;
  };

  // Apply filters to tasks - for list view (with completed tasks filter)
  const filteredTasksForList = applyFilters(tasks);

  // Apply filters to tasks - for kanban view (without completed tasks filter)
  const filteredTasksForKanban = tasks.filter(task => {
    // Apply all filters except the completed tasks filter

    // Filter by search query
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const query = filters.searchQuery.toLowerCase();
      const nameMatch = task.name.toLowerCase().includes(query);
      const descMatch = task.description?.toLowerCase().includes(query) || false;
      if (!nameMatch && !descMatch) return false;
    }

    // Handle overdue filter
    if (filters.isOverdue) {
      const now = new Date();
      const isDueAndNotCompleted = task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.COMPLETED;
      if (!isDueAndNotCompleted) return false;
    }

    // Normal status filtering (always apply if status filter is set)
    if (filters.status !== null && task.status !== filters.status) {
      return false;
    }

    // Filter by priority (only if not filtering by overdue)
    if (!filters.isOverdue && filters.priority !== null && task.priority !== filters.priority) {
      return false;
    }

    // Apply goal and category filters (same as in applyFilters function)
    // Special case: If both goals and categories filters are active
    if ((filters.goalIds.length > 0 || filters.goalId !== null) && filters.categoryIds.length > 0) {
      // Get all selected goals (from both goalId and goalIds)
      const selectedGoalIds = [...filters.goalIds];
      if (filters.goalId !== null && !selectedGoalIds.includes(filters.goalId)) {
        selectedGoalIds.push(filters.goalId);
      }

      // Check if the task is associated with any of the selected goals
      const isAssociatedWithAnySelectedGoal = selectedGoalIds.some(goalId =>
        isDescendantOf(task.goalId, goalId)
      );

      // Get the task's category (direct or inherited)
      const taskCategory = getGoalCategory(task.goalId);

      // Check if the task's category matches any of the selected categories
      const hasCategoryMatch = Boolean(
        taskCategory &&
        filters.categoryIds.includes(taskCategory)
      );

      // If the task is associated with a selected goal, it should pass the filter
      if (isAssociatedWithAnySelectedGoal) {
        return true;
      }

      // If the task's category matches a selected category, it should pass the filter
      if (hasCategoryMatch) {
        return true;
      }

      // If none of the above conditions are met, the task doesn't pass the filter
      return false;
    }

    // Normal case: Apply filters separately
    // Check if we need to apply goal filter
    let passesGoalFilter = true;

    // Get all selected goals (from both goalId and goalIds)
    const selectedGoalIds = [...filters.goalIds];
    if (filters.goalId !== null && !selectedGoalIds.includes(filters.goalId)) {
      selectedGoalIds.push(filters.goalId);
    }

    if (selectedGoalIds.length > 0) {
      // Check if task is directly assigned to any of the selected goals or their subgoals
      passesGoalFilter = selectedGoalIds.some(goalId =>
        isDescendantOf(task.goalId, goalId)
      );
    }

    // Check if we need to apply category filter
    let passesCategoryFilter = true;
    if (filters.categoryIds.length > 0) {
      // Get the category for this task's goal (or its parent goals)
      const taskCategory = getGoalCategory(task.goalId);

      // Check if the task's category matches one of the selected categories
      passesCategoryFilter = Boolean(
        taskCategory &&
        filters.categoryIds.includes(taskCategory)
      );
    }

    // The task must pass BOTH filters if both are active
    return passesGoalFilter && passesCategoryFilter;
  });

  // Removed header height measurement effect

  useEffect(() => {
    setMounted(true);
    // Force state update when tasks prop changes
    setTaskCount(tasks.length);
    console.log('[TaskView] tasks prop updated, forcing re-render. New count:', tasks.length);

    // Restore syncTasks logic
    if (tasks && tasks.length > 0) {
      syncTasks(tasks).then(result => {
        console.log('[TaskView] Tasks synchronized automatically:', result);
      }).catch(error => {
        console.error('[TaskView] Error syncing tasks automatically:', error);
      });
    }
  }, [tasks]); // Ensure tasks is in the dependency array

  // Close detail panel when task view changes
  useEffect(() => {
    // Close the detail panel when switching views
    handleCloseDetailPanel();
  }, [taskView]); // Dependency on taskView

  // Handle search query changes
  const handleSearch = (query: string) => {
    setFilters(prev => ({
      ...prev,
      searchQuery: query
    }));
  };

  // Handler for applying saved filters
  const handleApplySavedFilter = (savedFilters: TaskFilterOptions) => {
    setFilters(savedFilters);
  };

  // Handler for task click to show detail panel
  const handleTaskClick = (task: Task) => {
    if (selectedTask && selectedTask.id === task.id) {
      // If clicking the same task, close the panel
      setSelectedTask(null);
      setSelectedTaskId(null);
      setIsDetailPanelOpen(false);
    } else {
      // If clicking a different task, show its details
      setSelectedTask(task);
      setSelectedTaskId(task.id);
      setIsDetailPanelOpen(true);
    }
  };

  // Handler for closing the detail panel
  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedTask(null);
    setSelectedTaskId(null);
  };

  // Handler for editing a task
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  // Handler for closing the edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  // Handler for task status changes
  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    // Find the task in our local state
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return;
    }

    // Immediately force a re-render by updating the task count
    setTaskCount(prev => prev + 1);

    // Start a transition to update the UI
    startTransition(async () => {
      try {
        // Call the server action to update the task status
        await finalUpdateTaskStatus(taskId, status);
        // Force another re-render after server action completes
        setTaskCount(prev => prev + 1);
      } catch (error) {
        console.error(`Error updating task status:`, error);
      }
    });
  };

  // Handler for deleting a task
  const handleDeleteTask = (taskId: string) => {
    // Find the task in our local state
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return;
    }

    // Start a transition to update the UI
    startTransition(async () => {
      try {
        // Call the server action to delete the task
        const result = await deleteTask(taskId);

        if (result.success) {
          // If the deleted task is currently selected, close the detail panel
          if (selectedTask && selectedTask.id === taskId) {
            handleCloseDetailPanel();
          }

          // Force a re-render after server action completes
          setTaskCount(prev => prev - 1);
        } else {
          console.error(`Failed to delete task: ${result.message}`);
        }
      } catch (error) {
        console.error(`Error deleting task:`, error);
      }
    });
  };

  // Categories state is now declared at the top of the component

  // Fetch categories when component mounts if not provided
  useEffect(() => {
    if (!initialCategories || initialCategories.length === 0) {
      const fetchCategories = async () => {
        try {
          // Use the getCategories function from the server actions
          const response = await fetch('/api/categories');
          const data = await response.json();
          if (data.success && data.categories) {
            setCategories(data.categories);
          }
        } catch (error) {
          console.error('Error fetching categories:', error);
        }
      };

      fetchCategories();
    }
  }, [initialCategories]);

  // If not mounted yet, show a default view to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex flex-col h-full">
        {/* Fixed header section */}
        <div className="flex-shrink-0 bg-background">
          <Card className="mb-2">
            <CardContent className="p-2">
              <div className="w-1/2">
                <UnifiedTaskAdd goals={goals} />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Scrollable content area with flex-grow to fill available space */}
        <div className="flex-grow overflow-auto h-full pt-2">
          <TaskListWrapper tasks={tasks} goals={goals} hideSearchAndFilters={true} />
        </div>
      </div>
    );
  }

  return (
    // Main container with flex layout to fill available height and width
    <div className="flex flex-col h-full w-full">
      {/* Fixed header section - not sticky, just normal flow */}
      <div className="flex-shrink-0 bg-background z-30 w-full">
        {/* Card 1: Add Task / Filters / View Toggle - Consistent responsive layout */}
        <Card className="mb-2 py-0 gap-0">
          <CardContent className="px-2 py-2">
            <div className="flex items-center gap-2 min-h-[44px]">
              {/* Left side: Quick add task input and new task button - fixed width */}
              <div className="flex items-center space-x-2 min-w-0 flex-1 max-w-[400px]">
                <UnifiedTaskAdd goals={goals} className="flex-grow min-w-0" />

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 flex-shrink-0 bg-cyan-500/20 hover:bg-cyan-500/30 dark:bg-cyan-400/20 dark:hover:bg-cyan-400/30 border-2 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  onClick={() => setIsNewTaskModalOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </div>

              {/* Right side: Filters and view toggle - fixed layout */}
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                {/* Filters section - fixed width */}
                <div className="flex items-center gap-2 min-w-0 max-w-[450px]">
                  {/* Hierarchical Filter Dropdown - fixed width */}
                  <div className="min-w-0 flex-shrink-0 w-[120px]">
                    <HierarchicalFilterDropdown
                      categories={categories}
                      goals={goals}
                      selectedCategoryIds={filters.categoryIds}
                      selectedGoalId={filters.goalId}
                      selectedGoalIds={filters.goalIds}
                      onSelectionChange={(selection) => {
                        if (selection.type === 'clear') {
                          setFilters(prev => ({
                            ...prev,
                            goalId: null,
                            goalIds: [],
                            categoryIds: []
                          }));
                        } else if (selection.type === 'category' && selection.id) {
                          setFilters(prev => {
                            const categoryId = selection.id as string;
                            const isAddingCategory = !prev.categoryIds.includes(categoryId);
                            const newCategoryIds = isAddingCategory
                              ? [...prev.categoryIds, categoryId]
                              : prev.categoryIds.filter(id => id !== categoryId);
                            return {
                              ...prev,
                              categoryIds: newCategoryIds
                            };
                          });
                        } else if (selection.type === 'goal' && selection.id) {
                          setFilters(prev => {
                            const goalId = selection.id as string;
                            const isAlreadySelected = prev.goalIds.includes(goalId) || prev.goalId === goalId;
                            if (isAlreadySelected) {
                              return {
                                ...prev,
                                goalId: prev.goalId === goalId ? null : prev.goalId,
                                goalIds: prev.goalIds.filter(id => id !== goalId),
                              };
                            } else {
                              return {
                                ...prev,
                                goalId: prev.goalId || goalId,
                                goalIds: [...prev.goalIds, goalId],
                              };
                            }
                          });
                        }
                      }}
                    />
                  </div>

                  {/* Priority Filter - fixed width */}
                  <div className="flex-shrink-0 w-[90px]">
                    <Select
                      value={filters.priority || 'all'}
                      onValueChange={(value) => {
                        setFilters(prev => ({
                          ...prev,
                          priority: value === 'all' ? null : (value === 'overdue' ? null : value as TaskPriority),
                          isOverdue: value === 'overdue' ? true : false,
                        }));
                      }}
                    >
                      <SelectTrigger id="priority-filter" className="h-9 w-full">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Priority</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                        <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                        <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* View Toggle and Saved Filters - responsive layout */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 w-9 p-0 transition-all duration-200 flex-shrink-0",
                      taskView === 'list'
                        ? "bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => setTaskView('list')}
                    title="List View"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 w-9 p-0 transition-all duration-200 flex-shrink-0",
                      taskView === 'kanban'
                        ? "bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => setTaskView('kanban')}
                    title="Kanban View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>

                  {/* Saved Filters Dropdown */}
                  <SavedFiltersDropdown
                    currentFilters={filters}
                    onApplyFilter={handleApplySavedFilter}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Search / Filters / Etc. - Only shown in list view - Consistent responsive layout */}
        {taskView === 'list' && (
          <Card className="mb-2 py-0 gap-0">
            <CardContent className="px-2 py-2">
              <div className="flex items-center gap-2 min-h-[44px]">
                {/* Search Bar - fixed width */}
                <div className="min-w-0 flex-1 max-w-[400px]">
                  <SearchBar
                    onSearch={handleSearch}
                    initialQuery={filters.searchQuery || ''}
                  />
                </div>

                {/* Right side with filters and controls - fixed layout */}
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  {/* Status Filter - fixed width */}
                  <div className="flex-shrink-0 w-[90px]">
                    <Select
                      value={filters.status || 'all'}
                      onValueChange={(value) => {
                        setFilters(prev => ({
                          ...prev,
                          status: value === 'all' ? null : value
                        }));
                      }}
                    >
                      <SelectTrigger id="status-filter" className="h-9 w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Status</SelectItem>
                        <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
                        <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatus.COMPLETED}>Completed Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Right-aligned controls - fixed layout */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Select Button - fixed text */}
                    <Button
                      variant={isSelectMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newSelectMode = !isSelectMode;
                        setIsSelectMode(newSelectMode);
                        // If we're exiting select mode, trigger selection clearing
                        if (!newSelectMode) {
                          // Force a re-render to trigger the effect in TaskListWrapper
                          console.log('[TaskView] Exiting select mode, will trigger selection clearing');
                        }
                      }}
                      className="flex items-center gap-1 h-9 px-3 transition-all duration-200"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span>Select</span>
                    </Button>

                    {/* Completed Toggle - fixed layout and half size */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Label htmlFor="show-completed" className="text-sm cursor-pointer whitespace-nowrap">
                        Completed
                      </Label>
                      <Switch
                        id="show-completed"
                        checked={showCompletedTasks}
                        onCheckedChange={setShowCompletedTasks}
                        className="scale-50 data-[state=unchecked]:!bg-purple-500 data-[state=unchecked]:!border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tags Section - Shown in both list and kanban views */}
        {(filters.categoryIds.length > 0 || filters.goalId || filters.goalIds.length > 0 || filters.status || filters.priority || filters.isOverdue) && (
          <div className="flex flex-wrap items-center gap-2 mb-2 px-2">
            {/* Category Tags */}
            {filters.categoryIds.map(categoryId => {
              const category = categories.find(c => c.id === categoryId);
              if (!category) return null;
              return (
                <FilterTag
                  key={`category-${categoryId}`}
                  label="Category"
                  value={category.name}
                  color={category.color}
                  onRemove={() => {
                    setFilters(prev => ({
                      ...prev,
                      categoryIds: prev.categoryIds.filter(id => id !== categoryId)
                    }));
                  }}
                />
              );
            })}

            {/* Goal Tags - Show all selected goals */}
            {/* First show the goalId if it's set and not in goalIds */}
            {filters.goalId && !filters.goalIds.includes(filters.goalId) && (
              <FilterTag
                label="Goal"
                value={goals.find(g => g.id === filters.goalId)?.name || 'Unknown Goal'}
                color={goals.find(g => g.id === filters.goalId)?.category?.color}
                onRemove={() => {
                  setFilters(prev => ({
                    ...prev,
                    goalId: null
                  }));
                }}
              />
            )}

            {/* Then show all goals from goalIds */}
            {filters.goalIds.map(goalId => {
              const goal = goals.find(g => g.id === goalId);
              if (!goal) return null;
              return (
                <FilterTag
                  key={`goal-${goalId}`}
                  label="Goal"
                  value={goal.name}
                  color={goal.category?.color}
                  onRemove={() => {
                    setFilters(prev => ({
                      ...prev,
                      goalIds: prev.goalIds.filter(id => id !== goalId),
                      goalId: prev.goalId === goalId ? null : prev.goalId
                    }));
                  }}
                />
              );
            })}

            {/* Status Tag */}
            {filters.status && (
              <FilterTag
                label="Status"
                value={filters.status === TaskStatus.TODO ? 'To Do' :
                       filters.status === TaskStatus.IN_PROGRESS ? 'In Progress' :
                       filters.status === TaskStatus.COMPLETED ? 'Completed' : filters.status}
                onRemove={() => {
                  setFilters(prev => ({
                    ...prev,
                    status: null
                  }));
                }}
              />
            )}

            {/* Priority Tag */}
            {filters.priority && (
              <FilterTag
                label="Priority"
                value={filters.priority}
                onRemove={() => {
                  setFilters(prev => ({
                    ...prev,
                    priority: null
                  }));
                }}
              />
            )}

            {/* Overdue Tag */}
            {filters.isOverdue && (
              <FilterTag
                label="Filter"
                value="Overdue"
                color="#ef4444"
                onRemove={() => {
                  setFilters(prev => ({
                    ...prev,
                    isOverdue: false
                  }));
                }}
              />
            )}

            {/* Clear All Button */}
            {(filters.categoryIds.length > 0 || filters.goalId || filters.goalIds.length > 0 || filters.status || filters.priority || filters.isOverdue) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({
                    status: null,
                    priority: null,
                    goalId: null,
                    goalIds: [], // Clear goalIds array
                    categoryIds: [],
                    isOverdue: false,
                    searchQuery: filters.searchQuery || '',
                    sortBy: filters.sortBy || 'dueDate',
                    sortDirection: filters.sortDirection || 'asc',
                  });
                }}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content Section - Container that extends to the bottom of the screen */}
      <div className="flex-grow overflow-auto h-full pt-2 flex w-full">
        {/* Main content area - width adjusts based on detail panel */}
        <div className={`${isDetailPanelOpen ? 'w-1/2 min-w-0' : 'w-full'} h-full transition-all duration-300 ease-in-out`}>
          {taskView === 'list' ? (
            <TaskListWrapper
              key={taskCount}
              tasks={filteredTasksForList}
              goals={goals}
              categories={categories} // Pass categories for hierarchical dropdown
              isSelectMode={isSelectMode}
              searchFilters={filters}
              hideSearchAndFilters={true} // Hide these since we're showing them in the parent
              onTaskClick={handleTaskClick} // Add handler for task click
              selectedTaskId={selectedTaskId} // Pass selected task ID for active indication
              onClearSelection={handleClearSelection} // Add callback to handle selection clearing
            />
          ) : (
            <SimplifiedKanbanBoard
              key={taskCount}
              tasks={filteredTasksForKanban} // Use kanban-specific filtered tasks that ignore the completed filter
              goals={goals}
              onEdit={handleEditTask} // Use the edit handler
              onStatusChange={handleTaskStatusChange}
              onCompletionChange={(taskId, completed) => handleTaskStatusChange(taskId, completed ? TaskStatus.COMPLETED : TaskStatus.TODO)}
              onDeleteTask={handleDeleteTask} // Use the delete handler
              isParentPending={isPending}
            />
          )}
        </div>

        {/* Task Detail Panel - only visible when a task is selected */}
        {isDetailPanelOpen && selectedTask && (
          <div className="w-1/2 min-w-0 pl-4 transition-all duration-300 ease-in-out flex-shrink-0">
            <UnifiedTaskDetailView
              task={selectedTask}
              goalName={selectedTask.goal?.name}
              isOpen={isDetailPanelOpen}
              onOpenChange={(open) => {
                if (!open) handleCloseDetailPanel();
              }}
              onEdit={handleEditTask}
              mode="panel"
            />
          </div>
        )}
      </div>

      {/* Edit Task Modal */}
      {selectedTask && (
        <TaskModal
          mode="edit"
          isOpen={isEditModalOpen}
          onOpenChange={handleCloseEditModal}
          initialData={selectedTask}
          goals={goals}
          categories={categories} // Pass categories for hierarchical dropdown
        />
      )}

      {/* New Task Modal */}
      <TaskModal
        mode="create"
        isOpen={isNewTaskModalOpen}
        onOpenChange={setIsNewTaskModalOpen}
        goals={goals}
        categories={categories} // Pass categories for hierarchical dropdown
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}


