// src/tests/goal-detail-page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoalDetailClientWrapper } from '@/components/goals/GoalDetailClientWrapper';
import { GoalDetailHeader } from '@/components/goals/GoalDetailHeader';
import { GoalDetailInfo } from '@/components/goals/GoalDetailInfo';
import { GoalDetailSubGoals } from '@/components/goals/GoalDetailSubGoals';
import { GoalDetailTasks } from '@/components/goals/GoalDetailTasks';
import { deleteGoal, archiveGoal, unarchiveGoal } from '@/actions/goals';
import { deleteTask, updateTaskCompletion } from '@/actions/tasks';

// Mock the server actions
vi.mock('@/actions/goals', () => ({
  deleteGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal deleted successfully' }),
  archiveGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal archived successfully' }),
  unarchiveGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal unarchived successfully' }),
}));

vi.mock('@/actions/tasks', () => ({
  deleteTask: vi.fn().mockResolvedValue({ success: true, message: 'Task deleted successfully' }),
  updateTaskCompletion: vi.fn().mockResolvedValue({ success: true, message: 'Task completion updated successfully' }),
}));

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the GoalProgressHistory component
vi.mock('@/components/goals/GoalProgressHistory', () => ({
  GoalProgressHistory: vi.fn(() => <div data-testid="goal-progress-history">Progress History Mock</div>),
}));

// Mock the GoalModal component
vi.mock('@/components/goals/GoalModal', () => ({
  GoalModal: vi.fn(() => <div data-testid="goal-modal">Goal Modal Mock</div>),
}));

// Mock the TaskItem component
vi.mock('@/components/tasks/TaskItem', () => ({
  TaskItem: vi.fn(({ task, onEdit, onDeleteTask, onCompletionChange }) => (
    <div data-testid={`task-item-${task.id}`}>
      <span>{task.name}</span>
      <button onClick={() => onEdit(task)}>Edit Task</button>
      <button onClick={() => onDeleteTask(task.id)}>Delete Task</button>
      <button onClick={() => onCompletionChange(task.id, !task.completed)}>
        {task.completed ? 'Mark Incomplete' : 'Mark Complete'}
      </button>
    </div>
  )),
}));

// Mock the GoalCard component
vi.mock('@/components/goals/GoalCard', () => ({
  GoalCard: vi.fn(({ goal }) => (
    <div data-testid={`goal-card-${goal.id}`}>{goal.name}</div>
  )),
}));

// Create mock data for testing
const mockGoal = {
  id: 'goal1',
  name: 'Test Goal',
  description: 'Test Description',
  progress: 60,
  timeframe: 'QUARTERLY',
  deadline: new Date('2024-12-31').toISOString(),
  isArchived: false,
  userId: 'user_placeholder',
  parentGoalId: null,
  categoryId: 'cat1',
  category: { id: 'cat1', name: 'Work', color: '#ff0000' },
  tasks: [
    {
      id: 'task1',
      name: 'Task 1',
      description: 'Task 1 Description',
      completed: false,
      goalId: 'goal1',
      userId: 'user_placeholder',
    },
    {
      id: 'task2',
      name: 'Task 2',
      description: 'Task 2 Description',
      completed: true,
      goalId: 'goal1',
      userId: 'user_placeholder',
    },
  ],
  subGoals: [
    {
      id: 'subgoal1',
      name: 'Sub-Goal 1',
      description: 'Sub-Goal 1 Description',
      progress: 30,
      timeframe: 'MONTHLY',
      isArchived: false,
      userId: 'user_placeholder',
      parentGoalId: 'goal1',
      categoryId: 'cat1',
      category: { id: 'cat1', name: 'Work', color: '#ff0000' },
      _count: { subGoals: 0, tasks: 2 },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCategories = [
  { id: 'cat1', name: 'Work', color: '#ff0000' },
  { id: 'cat2', name: 'Personal', color: '#00ff00' },
];

const mockAllGoals = [
  { id: 'goal1', name: 'Test Goal' },
  { id: 'goal2', name: 'Another Goal' },
];

describe('Goal Detail Page Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GoalDetailHeader Component', () => {
    it('should render the goal name and category', () => {
      render(
        <GoalDetailHeader
          goal={mockGoal}
          onEdit={() => {}}
          isPending={false}
        />
      );

      expect(screen.getByText('Test Goal')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('QUARTERLY')).toBeInTheDocument();
    });

    it('should render the correct buttons for a goal', () => {
      render(
        <GoalDetailHeader
          goal={mockGoal}
          onEdit={() => {}}
          isPending={false}
        />
      );

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('GoalDetailInfo Component', () => {
    it('should render the goal description and progress', () => {
      render(<GoalDetailInfo goal={mockGoal} />);

      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Progress: 60%')).toBeInTheDocument();
      expect(screen.getByText('Deadline: December 31, 2024')).toBeInTheDocument();
      expect(screen.getByTestId('goal-progress-history')).toBeInTheDocument();
    });
  });

  describe('GoalDetailSubGoals Component', () => {
    it('should render the sub-goals', () => {
      const subGoalsForDisplay = mockGoal.subGoals.map(sg => ({
        ...sg,
        category: sg.category,
        tasks: [],
        timeframe: sg.timeframe,
        subGoalCount: sg._count.subGoals,
        completedTaskCount: 0,
        overdueTaskCount: 0,
      }));

      render(<GoalDetailSubGoals subGoals={subGoalsForDisplay} />);

      expect(screen.getByText('Sub-Goals')).toBeInTheDocument();
      expect(screen.getByTestId('goal-card-subgoal1')).toBeInTheDocument();
    });

    it('should not render anything when there are no sub-goals', () => {
      render(<GoalDetailSubGoals subGoals={[]} />);

      expect(screen.queryByText('Sub-Goals')).not.toBeInTheDocument();
    });
  });

  describe('GoalDetailTasks Component', () => {
    it('should render the tasks', () => {
      render(
        <GoalDetailTasks
          tasks={mockGoal.tasks}
          onEditTask={() => {}}
          onDeleteTask={() => {}}
          onCompletionChange={() => {}}
          isTaskDeletePending={false}
          isTaskCompletionPending={false}
        />
      );

      expect(screen.getByText('Associated Tasks')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-task1')).toBeInTheDocument();
      expect(screen.getByTestId('task-item-task2')).toBeInTheDocument();
    });

    it('should render a message when there are no tasks', () => {
      render(
        <GoalDetailTasks
          tasks={[]}
          onEditTask={() => {}}
          onDeleteTask={() => {}}
          onCompletionChange={() => {}}
          isTaskDeletePending={false}
          isTaskCompletionPending={false}
        />
      );

      expect(screen.getByText('Associated Tasks')).toBeInTheDocument();
      expect(screen.getByText('No associated tasks.')).toBeInTheDocument();
    });
  });

  describe('GoalDetailClientWrapper Component', () => {
    it('should render all sections of the goal detail page', () => {
      render(
        <GoalDetailClientWrapper
          goal={mockGoal}
          categories={mockCategories}
          allGoals={mockAllGoals}
        />
      );

      // Check if all sections are rendered
      expect(screen.getByText('Test Goal')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Progress: 60%')).toBeInTheDocument();
      expect(screen.getByText('Sub-Goals')).toBeInTheDocument();
      expect(screen.getByText('Associated Tasks')).toBeInTheDocument();
    });
  });
});
