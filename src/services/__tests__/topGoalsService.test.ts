/**
 * Tests for the Top Goals Cycling Algorithm
 */

import { Goal, Task, TaskStatus } from '@prisma/client';
import { calculateGoalScore, getTopGoals, GoalWithSubgoalCount } from '../topGoalsService';

// Mock data for testing
const mockGoals: GoalWithSubgoalCount[] = [
  {
    id: 'goal1',
    name: 'Goal 1',
    description: 'Goal with many subgoals and tasks',
    userId: 'user1',
    progress: 50,
    isArchived: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-10'),
    _count: { subGoals: 5 },
    order: 0,
  },
  {
    id: 'goal2',
    name: 'Goal 2',
    description: 'Goal with deadline soon',
    userId: 'user1',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    progress: 30,
    isArchived: false,
    createdAt: new Date('2023-01-05'),
    updatedAt: new Date('2023-01-15'),
    _count: { subGoals: 0 },
    order: 1,
  },
  {
    id: 'goal3',
    name: 'Goal 3',
    description: 'Goal with high progress',
    userId: 'user1',
    progress: 90,
    isArchived: false,
    createdAt: new Date('2023-01-10'),
    updatedAt: new Date('2023-01-20'),
    _count: { subGoals: 2 },
    order: 2,
  },
  {
    id: 'goal4',
    name: 'Goal 4',
    description: 'Archived goal',
    userId: 'user1',
    progress: 100,
    isArchived: true,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-01-25'),
    _count: { subGoals: 0 },
    order: 3,
  },
  {
    id: 'goal5',
    name: 'Goal 5',
    description: 'Goal with overdue tasks',
    userId: 'user1',
    progress: 40,
    isArchived: false,
    createdAt: new Date('2023-01-20'),
    updatedAt: new Date('2023-01-30'),
    _count: { subGoals: 1 },
    order: 4,
  },
] as GoalWithSubgoalCount[];

const mockTasks: Task[] = [
  {
    id: 'task1',
    name: 'Task 1 for Goal 1',
    goalId: 'goal1',
    userId: 'user1',
    status: TaskStatus.TODO,
    priority: 'MEDIUM',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'task2',
    name: 'Task 2 for Goal 1',
    goalId: 'goal1',
    userId: 'user1',
    status: TaskStatus.IN_PROGRESS,
    priority: 'HIGH',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: 'task3',
    name: 'Task 3 for Goal 1',
    goalId: 'goal1',
    userId: 'user1',
    status: TaskStatus.COMPLETED,
    priority: 'LOW',
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
  {
    id: 'task4',
    name: 'Task 1 for Goal 2',
    goalId: 'goal2',
    userId: 'user1',
    status: TaskStatus.TODO,
    priority: 'MEDIUM',
    createdAt: new Date('2023-01-04'),
    updatedAt: new Date('2023-01-04'),
  },
  {
    id: 'task5',
    name: 'Task 1 for Goal 3',
    goalId: 'goal3',
    userId: 'user1',
    status: TaskStatus.COMPLETED,
    priority: 'HIGH',
    createdAt: new Date('2023-01-05'),
    updatedAt: new Date('2023-01-05'),
  },
  {
    id: 'task6',
    name: 'Task 1 for Goal 5',
    goalId: 'goal5',
    userId: 'user1',
    status: TaskStatus.TODO,
    priority: 'HIGH',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
    createdAt: new Date('2023-01-06'),
    updatedAt: new Date('2023-01-06'),
  },
] as Task[];

describe('Top Goals Cycling Algorithm', () => {
  describe('calculateGoalScore', () => {
    it('should calculate the correct score for a goal', () => {
      const goal = mockGoals[0]; // Goal 1
      const tasks = mockTasks.filter(task => task.goalId === goal.id);
      
      const result = calculateGoalScore(goal, tasks, mockGoals, mockTasks);
      
      expect(result).toBeDefined();
      expect(result.goal).toBe(goal);
      expect(result.tasks).toEqual(tasks);
      expect(result.baseScore).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
    });
    
    it('should apply secondary modifiers correctly', () => {
      const goal = mockGoals[4]; // Goal 5 with overdue tasks
      const tasks = mockTasks.filter(task => task.goalId === goal.id);
      
      const result = calculateGoalScore(goal, tasks, mockGoals, mockTasks);
      
      expect(result.modifiers.overdueTasks).toBe(0.15); // Should have overdue tasks modifier
    });
  });
  
  describe('getTopGoals', () => {
    it('should return the top goals sorted by score', () => {
      const result = getTopGoals(mockGoals, mockTasks, 3, false); // Don't use cache for testing
      
      expect(result).toHaveLength(3);
      expect(result[0][0]).toBeDefined(); // Goal
      expect(result[0][1]).toBeDefined(); // Tasks
    });
    
    it('should filter out archived goals', () => {
      const result = getTopGoals(mockGoals, mockTasks, 3, false);
      
      // Goal 4 is archived and should not be included
      const includedGoalIds = result.map(([goal]) => goal.id);
      expect(includedGoalIds).not.toContain('goal4');
    });
    
    it('should handle the case with no goals', () => {
      const result = getTopGoals([], mockTasks, 3, false);
      
      expect(result).toHaveLength(0);
    });
    
    it('should handle the case with fewer than the requested number of goals', () => {
      const result = getTopGoals(mockGoals.slice(0, 2), mockTasks, 3, false);
      
      expect(result).toHaveLength(2); // Only 2 goals available
    });
  });
});
