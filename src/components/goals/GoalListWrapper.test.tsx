// src/components/goals/GoalListWrapper.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalListWrapper } from './GoalListWrapper';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock the actions
vi.mock('@/actions/goals', () => ({
  deleteGoal: vi.fn(),
  archiveGoal: vi.fn(),
  unarchiveGoal: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Create mock data
const mockCategories = [
  { id: 'cat1', name: 'Work', color: '#ff0000', order: 1 },
  { id: 'cat2', name: 'Personal', color: '#00ff00', order: 2 },
];

const mockGoals = [
  // Parent goal 1
  {
    id: 'goal1',
    name: 'Parent Goal 1',
    description: 'Parent Goal 1 Description',
    categoryId: 'cat1',
    deadline: null,
    progress: 50,
    isArchived: false,
    userId: 'user1',
    parentGoalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    timeframe: 'Quarter Goal',
    category: { id: 'cat1', name: 'Work', color: '#ff0000' },
    tasks: [{ id: 'task1', completed: true, dueDate: null }],
    _count: { subGoals: 2 },
    subGoalCount: 2,
    completedTaskCount: 1,
    overdueTaskCount: 0
  },
  // Subgoal 1 of Parent Goal 1
  {
    id: 'subgoal1',
    name: 'Subgoal 1',
    description: 'Subgoal 1 Description',
    categoryId: 'cat1',
    deadline: null,
    progress: 25,
    isArchived: false,
    userId: 'user1',
    parentGoalId: 'goal1',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeframe: 'Month Goal',
    category: { id: 'cat1', name: 'Work', color: '#ff0000' },
    tasks: [],
    _count: { subGoals: 1 },
    subGoalCount: 1,
    completedTaskCount: 0,
    overdueTaskCount: 0
  },
  // Subgoal of Subgoal 1
  {
    id: 'subsubgoal1',
    name: 'Sub-subgoal 1',
    description: 'Sub-subgoal 1 Description',
    categoryId: 'cat1',
    deadline: null,
    progress: 0,
    isArchived: false,
    userId: 'user1',
    parentGoalId: 'subgoal1',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeframe: 'Week Goal',
    category: { id: 'cat1', name: 'Work', color: '#ff0000' },
    tasks: [],
    _count: { subGoals: 0 },
    subGoalCount: 0,
    completedTaskCount: 0,
    overdueTaskCount: 0
  },
  // Subgoal 2 of Parent Goal 1
  {
    id: 'subgoal2',
    name: 'Subgoal 2',
    description: 'Subgoal 2 Description',
    categoryId: 'cat1',
    deadline: null,
    progress: 75,
    isArchived: false,
    userId: 'user1',
    parentGoalId: 'goal1',
    createdAt: new Date(),
    updatedAt: new Date(),
    timeframe: 'Month Goal',
    category: { id: 'cat1', name: 'Work', color: '#ff0000' },
    tasks: [],
    _count: { subGoals: 0 },
    subGoalCount: 0,
    completedTaskCount: 0,
    overdueTaskCount: 0
  },
  // Parent goal 2
  {
    id: 'goal2',
    name: 'Parent Goal 2',
    description: 'Parent Goal 2 Description',
    categoryId: 'cat2',
    deadline: null,
    progress: 0,
    isArchived: false,
    userId: 'user1',
    parentGoalId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    timeframe: 'Quarter Goal',
    category: { id: 'cat2', name: 'Personal', color: '#00ff00' },
    tasks: [],
    _count: { subGoals: 0 },
    subGoalCount: 0,
    completedTaskCount: 0,
    overdueTaskCount: 0
  },
];

describe('GoalListWrapper Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render parent goals', () => {
    render(<GoalListWrapper goals={mockGoals} categories={mockCategories} />);

    // Check if parent goals are rendered
    expect(screen.getByText('Parent Goal 1')).toBeInTheDocument();
    expect(screen.getByText('Parent Goal 2')).toBeInTheDocument();
  });

  it('should expand and collapse parent goals', () => {
    render(<GoalListWrapper goals={mockGoals} categories={mockCategories} />);

    // Initially, subgoals should not be visible
    expect(screen.queryByText('Subgoal 1')).not.toBeInTheDocument();

    // Find and click the expand button for Parent Goal 1
    const expandButton = screen.getAllByRole('button', { name: /Expand sub-goals/i })[0];
    fireEvent.click(expandButton);

    // Now subgoals should be visible
    expect(screen.getByText('Subgoal 1')).toBeInTheDocument();
    expect(screen.getByText('Subgoal 2')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(expandButton);

    // Subgoals should be hidden again
    expect(screen.queryByText('Subgoal 1')).not.toBeInTheDocument();
  });

  it('should expand nested subgoals', () => {
    render(<GoalListWrapper goals={mockGoals} categories={mockCategories} />);

    // Expand Parent Goal 1
    const parentExpandButton = screen.getAllByRole('button', { name: /Expand sub-goals/i })[0];
    fireEvent.click(parentExpandButton);

    // Now Subgoal 1 should be visible
    expect(screen.getByText('Subgoal 1')).toBeInTheDocument();

    // Find and click the expand button for Subgoal 1
    const subgoalExpandButtons = screen.getAllByRole('button', { name: /Expand sub-goals/i });
    // The second button should be for Subgoal 1
    fireEvent.click(subgoalExpandButtons[1]);

    // Now Sub-subgoal 1 should be visible
    expect(screen.getByText('Sub-subgoal 1')).toBeInTheDocument();
  });

  it('should save expanded state to localStorage', () => {
    render(<GoalListWrapper goals={mockGoals} categories={mockCategories} />);

    // Expand Parent Goal 1
    const expandButton = screen.getAllByRole('button', { name: /Expand sub-goals/i })[0];
    fireEvent.click(expandButton);

    // Check if localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should restore expanded state from localStorage', () => {
    // Set up localStorage with expanded goal
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'allExpandedGoalIds') {
        return JSON.stringify(['goal1']);
      }
      return null;
    });

    render(<GoalListWrapper goals={mockGoals} categories={mockCategories} />);

    // Subgoals should be visible immediately
    expect(screen.getByText('Subgoal 1')).toBeInTheDocument();
    expect(screen.getByText('Subgoal 2')).toBeInTheDocument();
  });
});
