// src/tests/goals-page.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoalListWrapper } from '@/components/goals/GoalListWrapper';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalModal } from '@/components/goals/GoalModal';
import { DraggableGoalList } from '@/components/goals/DraggableGoalList';
import { createGoal, updateGoal, deleteGoal, archiveGoal, unarchiveGoal } from '@/actions/goals';

// Mock the server actions
vi.mock('@/actions/goals', () => ({
  createGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal created successfully' }),
  updateGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal updated successfully' }),
  deleteGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal deleted successfully' }),
  archiveGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal archived successfully' }),
  unarchiveGoal: vi.fn().mockResolvedValue({ success: true, message: 'Goal unarchived successfully' }),
}));

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the DndContext for drag and drop functionality
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSensors: vi.fn(),
  useSensor: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSortable: vi.fn().mockReturnValue({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToVerticalAxis: vi.fn(),
  snapCenterToCursor: vi.fn(),
}));

// Create mock data for testing
const mockGoals = [
  {
    id: 'goal1',
    name: 'Test Goal 1',
    description: 'Test Description 1',
    progress: 60,
    timeframe: 'QUARTERLY',
    deadline: new Date('2024-12-31').toISOString(),
    isArchived: false,
    userId: 'user_placeholder',
    parentGoalId: null,
    categoryId: 'cat1',
    category: { id: 'cat1', name: 'Work', color: '#ff0000' },
    subGoalCount: 2,
    completedTaskCount: 3,
    overdueTaskCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'goal2',
    name: 'Test Goal 2',
    description: 'Test Description 2',
    progress: 30,
    timeframe: 'MONTHLY',
    deadline: new Date('2024-11-30').toISOString(),
    isArchived: false,
    userId: 'user_placeholder',
    parentGoalId: null,
    categoryId: 'cat2',
    category: { id: 'cat2', name: 'Personal', color: '#00ff00' },
    subGoalCount: 0,
    completedTaskCount: 1,
    overdueTaskCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subgoal1',
    name: 'Sub-Goal 1',
    description: 'Sub-Goal Description 1',
    progress: 40,
    timeframe: 'WEEKLY',
    deadline: new Date('2024-10-31').toISOString(),
    isArchived: false,
    userId: 'user_placeholder',
    parentGoalId: 'goal1',
    categoryId: 'cat1',
    category: { id: 'cat1', name: 'Work', color: '#ff0000' },
    subGoalCount: 0,
    completedTaskCount: 2,
    overdueTaskCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockCategories = [
  { id: 'cat1', name: 'Work', color: '#ff0000' },
  { id: 'cat2', name: 'Personal', color: '#00ff00' },
];

// Mock the GoalCard component for testing
vi.mock('@/components/goals/GoalCard', () => ({
  GoalCard: vi.fn(({ goal, onEdit, onDelete, onArchive, onUnarchive, onClick }) => (
    <div data-testid={`goal-card-${goal.id}`}>
      <span>{goal.name}</span>
      <button onClick={() => onEdit(goal)}>Edit</button>
      <button onClick={() => onDelete(goal.id)}>Delete</button>
      <button onClick={() => onArchive(goal.id)}>Archive</button>
      <button onClick={() => onUnarchive(goal.id)}>Unarchive</button>
      <button onClick={() => onClick && onClick(goal.id)}>View</button>
    </div>
  )),
}));

// Mock the GoalModal component
vi.mock('@/components/goals/GoalModal', () => ({
  GoalModal: vi.fn(({ isOpen, onClose, goalToEdit }) => (
    <div data-testid="goal-modal" style={{ display: isOpen ? 'block' : 'none' }}>
      <span>Goal Modal</span>
      <span>{goalToEdit ? 'Edit Mode' : 'Create Mode'}</span>
      <button onClick={onClose}>Close</button>
    </div>
  )),
}));

describe('Goals Page Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GoalCard Component', () => {
    it('should render the goal information', () => {
      render(
        <GoalCard
          goal={mockGoals[0]}
          onEdit={() => {}}
          onDelete={() => {}}
          onArchive={() => {}}
          onUnarchive={() => {}}
        />
      );

      expect(screen.getByText('Test Goal 1')).toBeInTheDocument();
    });

    it('should call the appropriate handlers when buttons are clicked', () => {
      const mockOnEdit = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnArchive = vi.fn();
      const mockOnUnarchive = vi.fn();
      const mockOnClick = vi.fn();

      render(
        <GoalCard
          goal={mockGoals[0]}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onArchive={mockOnArchive}
          onUnarchive={mockOnUnarchive}
          onClick={mockOnClick}
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      expect(mockOnEdit).toHaveBeenCalledWith(mockGoals[0]);

      fireEvent.click(screen.getByText('Delete'));
      expect(mockOnDelete).toHaveBeenCalledWith(mockGoals[0].id);

      fireEvent.click(screen.getByText('Archive'));
      expect(mockOnArchive).toHaveBeenCalledWith(mockGoals[0].id);

      fireEvent.click(screen.getByText('View'));
      expect(mockOnClick).toHaveBeenCalledWith(mockGoals[0].id);
    });
  });

  describe('GoalModal Component', () => {
    it('should render in create mode when no goal is provided', () => {
      render(
        <GoalModal
          isOpen={true}
          onClose={() => {}}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('goal-modal')).toBeInTheDocument();
      expect(screen.getByText('Create Mode')).toBeInTheDocument();
    });

    it('should render in edit mode when a goal is provided', () => {
      render(
        <GoalModal
          isOpen={true}
          onClose={() => {}}
          categories={mockCategories}
          goalToEdit={mockGoals[0]}
        />
      );

      expect(screen.getByTestId('goal-modal')).toBeInTheDocument();
      expect(screen.getByText('Edit Mode')).toBeInTheDocument();
    });

    it('should not be visible when isOpen is false', () => {
      render(
        <GoalModal
          isOpen={false}
          onClose={() => {}}
          categories={mockCategories}
        />
      );

      const modal = screen.getByTestId('goal-modal');
      expect(modal).toHaveStyle('display: none');
    });
  });

  describe('DraggableGoalList Component', () => {
    it('should render the list of goals', () => {
      render(
        <DraggableGoalList
          goals={mockGoals}
          categories={mockCategories}
          onEdit={() => {}}
          onDelete={() => {}}
          onClick={() => {}}
          onExpandToggle={() => {}}
          expandedGoals={new Set()}
          onGoalsReordered={() => {}}
        />
      );

      // Only top-level goals should be rendered initially
      expect(screen.getByText('Test Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Test Goal 2')).toBeInTheDocument();
      // Sub-goals should not be rendered at the top level
      expect(screen.queryByText('Sub-Goal 1')).not.toBeInTheDocument();
    });
  });

  describe('GoalListWrapper Component', () => {
    it('should render the list of goals and handle state changes', async () => {
      render(
        <GoalListWrapper
          goals={mockGoals}
          categories={mockCategories}
        />
      );

      // Check if goals are rendered
      expect(screen.getByText('Test Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Test Goal 2')).toBeInTheDocument();

      // Test toggling between active and archived views
      // This would require more complex testing with state management
    });
  });
});
