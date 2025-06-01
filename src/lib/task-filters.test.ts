/**
 * Tests for task filtering utilities
 */
import { applyFilters } from './task-filters';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { TaskFilterOptions } from '@/components/tasks/TaskFilters';

// Mock data for testing
const mockGoals = [
  {
    id: 'goal1',
    name: 'Parent Goal 1',
    categoryId: 'cat1',
    parentGoalId: null,
    category: { id: 'cat1', name: 'Category 1', color: '#ff0000' }
  },
  {
    id: 'goal2',
    name: 'Child Goal 1',
    categoryId: null, // Inherits category from parent
    parentGoalId: 'goal1',
    category: null
  },
  {
    id: 'goal3',
    name: 'Parent Goal 2',
    categoryId: 'cat2',
    parentGoalId: null,
    category: { id: 'cat2', name: 'Category 2', color: '#00ff00' }
  },
  {
    id: 'goal4',
    name: 'Child Goal 2',
    categoryId: null, // Inherits category from parent
    parentGoalId: 'goal3',
    category: null
  }
];

const mockTasks = [
  {
    id: 'task1',
    name: 'Task 1',
    description: 'Task 1 description',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    goalId: 'goal1',
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
    goal: mockGoals[0]
  },
  {
    id: 'task2',
    name: 'Task 2',
    description: 'Task 2 description',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    goalId: 'goal2',
    dueDate: new Date(Date.now() + 86400000), // Tomorrow
    goal: mockGoals[1]
  },
  {
    id: 'task3',
    name: 'Task 3',
    description: 'Task 3 description',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.LOW,
    goalId: 'goal3',
    dueDate: new Date(Date.now() - 86400000), // Yesterday
    goal: mockGoals[2]
  },
  {
    id: 'task4',
    name: 'Task 4',
    description: 'Task 4 description',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    goalId: 'goal4',
    dueDate: new Date(Date.now() - 86400000), // Yesterday
    goal: mockGoals[3]
  }
];

// Default filter state
const defaultFilters: TaskFilterOptions = {
  status: null,
  priority: null,
  goalId: null,
  categoryIds: [],
  isOverdue: false,
  searchQuery: '',
  sortBy: 'dueDate',
  sortDirection: 'asc',
};

describe('Task Filters', () => {
  // Test filtering by goal
  test('filters tasks by goal (including subgoals)', () => {
    const filters = {
      ...defaultFilters,
      goalId: 'goal1'
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include task1 (direct goal) and task2 (subgoal)
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toContain('task1');
    expect(result.map(t => t.id)).toContain('task2');
  });

  // Test filtering by category
  test('filters tasks by category', () => {
    const filters = {
      ...defaultFilters,
      categoryIds: ['cat1']
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include task1 (direct category) and task2 (inherited category)
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toContain('task1');
    expect(result.map(t => t.id)).toContain('task2');
  });

  // Test filtering by both goal and category
  test('filters tasks by both goal and category', () => {
    const filters = {
      ...defaultFilters,
      goalId: 'goal1',
      categoryIds: ['cat1']
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include task1 and task2 (both match goal1 and category cat1)
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toContain('task1');
    expect(result.map(t => t.id)).toContain('task2');
  });

  // Test filtering by both goal and category with OR condition
  test('filters tasks by both goal and category with OR condition', () => {
    const filters = {
      ...defaultFilters,
      goalId: 'goal1',
      categoryIds: ['cat2']
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include tasks from goal1 OR category cat2
    // With the new OR condition, this should include tasks from goal1
    expect(result.length).toBeGreaterThan(0);
    // All results should either be in goal1 or category cat2
    result.forEach(task => {
      const isInGoal1 = task.goalId === 'goal1' || mockGoals.find(g => g.id === task.goalId)?.parentGoalId === 'goal1';
      const isInCat2 = mockGoals.find(g => g.id === task.goalId)?.categoryId === 'cat2';
      expect(isInGoal1 || isInCat2).toBe(true);
    });
  });

  // Test special case: goal belongs to one of the selected categories
  test('special case: goal belongs to one of the selected categories', () => {
    // Add a new goal that belongs to category cat2
    const extendedGoals = [
      ...mockGoals,
      {
        id: 'goal5',
        name: 'Goal in Category 2',
        categoryId: 'cat2',
        parentGoalId: null,
        category: { id: 'cat2', name: 'Category 2', color: '#00ff00' }
      }
    ];

    // Add a task assigned to this goal
    const extendedTasks = [
      ...mockTasks,
      {
        id: 'task5',
        name: 'Task 5',
        description: 'Task 5 description',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        goalId: 'goal5',
        dueDate: new Date(),
        goal: extendedGoals[4]
      }
    ];

    const filters = {
      ...defaultFilters,
      goalId: 'goal5',
      categoryIds: ['cat2']
    };

    const result = applyFilters(extendedTasks, filters, extendedGoals, true, false);

    // Should include task5 (matches goal5 which belongs to category cat2)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task5');
  });

  // Test filtering by status
  test('filters tasks by status', () => {
    const filters = {
      ...defaultFilters,
      status: TaskStatus.TODO
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include task1 and task4 (both TODO)
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toContain('task1');
    expect(result.map(t => t.id)).toContain('task4');
  });

  // Test filtering by priority
  test('filters tasks by priority', () => {
    const filters = {
      ...defaultFilters,
      priority: TaskPriority.HIGH
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include task1 and task4 (both HIGH priority)
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toContain('task1');
    expect(result.map(t => t.id)).toContain('task4');
  });

  // Test filtering by overdue
  test('filters tasks by overdue status', () => {
    const filters = {
      ...defaultFilters,
      isOverdue: true
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include task3 and task4 (both overdue)
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toContain('task3');
    expect(result.map(t => t.id)).toContain('task4');
  });

  // Test filtering by search query
  test('filters tasks by search query', () => {
    const filters = {
      ...defaultFilters,
      searchQuery: 'Task 1'
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include only task1
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task1');
  });

  // Test filtering with multiple criteria
  test('filters tasks with multiple criteria', () => {
    const filters = {
      ...defaultFilters,
      goalId: 'goal1',
      priority: TaskPriority.HIGH
    };

    const result = applyFilters(mockTasks, filters, mockGoals, true, false);

    // Should include only task1 (matches goal1 and HIGH priority)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('task1');
  });

  // Test the OR condition with goal and category filters
  test('uses OR condition when both goal and category filters are active', () => {
    // Create a scenario where tasks are in different goals and categories
    const specialGoals = [
      {
        id: 'goal-a',
        name: 'Goal A',
        categoryId: 'cat-x',
        parentGoalId: null,
        category: { id: 'cat-x', name: 'Category X', color: '#ff0000' }
      },
      {
        id: 'goal-b',
        name: 'Goal B',
        categoryId: 'cat-y',
        parentGoalId: null,
        category: { id: 'cat-y', name: 'Category Y', color: '#00ff00' }
      }
    ];

    const specialTasks = [
      {
        id: 'task-a',
        name: 'Task A',
        description: 'Task in Goal A (Category X)',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        goalId: 'goal-a',
        dueDate: new Date(),
        goal: specialGoals[0]
      },
      {
        id: 'task-b',
        name: 'Task B',
        description: 'Task in Goal B (Category Y)',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        goalId: 'goal-b',
        dueDate: new Date(),
        goal: specialGoals[1]
      }
    ];

    // Filter by Goal A and Category Y
    const filters = {
      ...defaultFilters,
      goalId: 'goal-a',
      categoryIds: ['cat-y']
    };

    const result = applyFilters(specialTasks, filters, specialGoals, true, false);

    // Should include both tasks because of the OR condition
    // Task A is in Goal A, Task B is in Category Y
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toContain('task-a');
    expect(result.map(t => t.id)).toContain('task-b');
  });
});
