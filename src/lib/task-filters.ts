/**
 * Task filtering utilities
 */
import { Task, TaskStatus, TaskPriority } from '@prisma/client';
import { TaskFilterOptions } from '@/components/tasks/TaskFilters';

// Define a more complete Task type that includes the goal relationship
type TaskWithGoal = Task & {
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

// Define a more complete Goal type that includes the category relationship
type Goal = {
  id: string;
  name: string;
  categoryId?: string | null;
  parentGoalId?: string | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
};

/**
 * Applies all active filters to a list of tasks
 * @param tasksToFilter The tasks to filter
 * @param filters The current filter state
 * @param goals All available goals
 * @param showCompletedTasks Whether to show completed tasks
 * @param debug Whether to log debug information
 * @returns Filtered tasks
 */
export const applyFilters = (
  tasksToFilter: TaskWithGoal[],
  filters: TaskFilterOptions,
  goals: Goal[],
  showCompletedTasks: boolean,
  debug: boolean = false
): TaskWithGoal[] => {
  // Add logging to understand the filter state if debug is enabled
  if (debug) {
    console.log('Filter state:', {
      goalId: filters.goalId,
      categoryIds: filters.categoryIds,
      status: filters.status,
      priority: filters.priority,
      isOverdue: filters.isOverdue
    });

    console.log('All tasks before filtering:', tasksToFilter.map(t => ({
      id: t.id,
      name: t.name,
      goalId: t.goalId,
      goal: goals.find(g => g.id === t.goalId)
    })));
  }

  // Create a map of goal categories for faster lookup
  const goalCategoryMap = new Map<string, string | null>();

  // Create a map of parent-child relationships for goals
  const goalParentMap = new Map<string, string | null>();

  // Precompute these relationships for better performance
  goals.forEach(goal => {
    goalCategoryMap.set(goal.id, goal.categoryId);
    goalParentMap.set(goal.id, goal.parentGoalId);
  });

  // Helper function to check if a goal is a descendant of another goal
  const isDescendantOf = (goalId: string | null, ancestorId: string): boolean => {
    if (!goalId) return false;
    if (goalId === ancestorId) return true;

    let currentGoalId = goalId;
    while (currentGoalId) {
      const parentId = goalParentMap.get(currentGoalId);
      if (parentId === ancestorId) return true;
      if (!parentId) break;
      currentGoalId = parentId;
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

  return tasksToFilter.filter(task => {
    // Log the task being evaluated for debugging
    if (debug) {
      console.log('Task being evaluated:', {
        id: task.id,
        name: task.name,
        goalId: task.goalId,
        goal: goals.find(g => g.id === task.goalId)
      });
    }

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
    // Check if we have any selected goals (either from goalId or goalIds property)
    const hasSelectedGoals = filters.goalId !== null || (filters.goalIds && filters.goalIds.length > 0);

    if (hasSelectedGoals && filters.categoryIds.length > 0) {
      // Get all selected goals (from both goalId and goalIds)
      const selectedGoalIds = filters.goalIds ? [...filters.goalIds] : [];
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
      if (debug) {
        console.log('SPECIAL CASE - Both filters active:', {
          selectedGoalIds,
          selectedGoalCategories,
          selectedCategories: filters.categoryIds,
          taskGoalId: task.goalId,
          taskGoalName: taskGoal?.name,
          taskCategory
        });
      }

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
        if (debug) {
          console.log(`SPECIAL CASE - Task ${task.id} passes because it's associated with a selected goal`);
        }
        return true;
      }

      // If the task's category matches a selected category, it should pass the filter
      if (hasCategoryMatch) {
        if (debug) {
          console.log(`SPECIAL CASE - Task ${task.id} passes because it belongs to a selected category`);
        }
        return true;
      }

      // If none of the above conditions are met, the task doesn't pass the filter
      if (debug) {
        console.log(`SPECIAL CASE - Task ${task.id} fails both goal and category filters`);
      }
      return false;
    }

    // Normal case: Apply filters separately
    // Check if we need to apply goal filter
    let passesGoalFilter = true;

    // Get all selected goals (from both goalId and goalIds)
    const selectedGoalIds = filters.goalIds ? [...filters.goalIds] : [];
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

    // Log the filter results for debugging
    if (debug) {
      console.log('Goal filter result:', passesGoalFilter);
      console.log('Category filter result:', passesCategoryFilter);
    }

    // The task must pass BOTH filters if both are active
    return passesGoalFilter && passesCategoryFilter;
  });
};
