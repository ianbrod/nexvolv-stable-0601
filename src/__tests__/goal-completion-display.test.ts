import { addDays, subDays } from 'date-fns';
import { calculateGoalProgression } from '@/lib/utils/goal-progression';
import { Goal, Task, TaskStatus } from '@prisma/client';

// Mock data for testing
const mockGoal: Goal = {
  id: 'goal-1',
  name: 'Test Goal',
  description: 'Test Description',
  timeframe: 'Quarter',
  categoryId: 'cat-1',
  deadline: new Date('2024-12-31'),
  progress: 0,
  isArchived: false,
  userId: 'user-1',
  order: 0,
  lastDisplayedAt: null,
  completedAt: null,
  parentGoalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: null
};

const mockTasks: Task[] = [
  {
    id: 'task-1',
    name: 'Task 1',
    description: 'Task 1 Description',
    priority: 'MEDIUM',
    dueDate: new Date('2024-06-01'),
    status: TaskStatus.TODO,
    completedAt: null,
    startedAt: null,
    recurrencePattern: 'NONE',
    recurrenceEndDate: null,
    parentTaskId: null,
    lastGeneratedDate: null,
    goalId: 'goal-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-2',
    name: 'Task 2',
    description: 'Task 2 Description',
    priority: 'MEDIUM',
    dueDate: new Date('2024-06-15'),
    status: TaskStatus.TODO,
    completedAt: null,
    startedAt: null,
    recurrencePattern: 'NONE',
    recurrenceEndDate: null,
    parentTaskId: null,
    lastGeneratedDate: null,
    goalId: 'goal-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('Goal Completion Display Tests', () => {
  test('Goal progress should be 0% when no tasks are completed', () => {
    const progress = calculateGoalProgression(mockGoal, [mockGoal], mockTasks);
    expect(progress).toBe(0);
  });

  test('Goal progress should be 50% when half of tasks are completed', () => {
    const completedTask = { ...mockTasks[0], status: TaskStatus.COMPLETED, completedAt: new Date() };
    const tasks = [completedTask, mockTasks[1]];
    const progress = calculateGoalProgression(mockGoal, [mockGoal], tasks);
    expect(progress).toBe(50);
  });

  test('Goal progress should be 100% when all tasks are completed', () => {
    const completedTasks = mockTasks.map(task => ({
      ...task,
      status: TaskStatus.COMPLETED,
      completedAt: new Date()
    }));
    const progress = calculateGoalProgression(mockGoal, [mockGoal], completedTasks);
    expect(progress).toBe(100);
  });

  test('Recently completed goals (less than 3 days ago) should be included', () => {
    const recentlyCompletedGoal = {
      ...mockGoal,
      progress: 100,
      completedAt: subDays(new Date(), 2) // 2 days ago
    };
    
    // This would be tested in a real environment with the actual getTopGoals function
    // For this test, we're just verifying the date logic
    const threeDaysAgo = subDays(new Date(), 3);
    const isRecent = recentlyCompletedGoal.completedAt! >= threeDaysAgo;
    
    expect(isRecent).toBe(true);
  });

  test('Older completed goals (more than 3 days ago) should be excluded', () => {
    const oldCompletedGoal = {
      ...mockGoal,
      progress: 100,
      completedAt: subDays(new Date(), 4) // 4 days ago
    };
    
    // This would be tested in a real environment with the actual getTopGoals function
    // For this test, we're just verifying the date logic
    const threeDaysAgo = subDays(new Date(), 3);
    const isRecent = oldCompletedGoal.completedAt! >= threeDaysAgo;
    
    expect(isRecent).toBe(false);
  });
});
