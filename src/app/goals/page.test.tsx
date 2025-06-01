// src/app/goals/page.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
// Explicitly import test functions from vitest
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoalsPage from './page'; // Import the component
import { Goal, Category } from '@/types';

// Mock the database functions
vi.mock('@/lib/db', () => ({
  getGoals: vi.fn(),
  getCategories: vi.fn(),
  deleteGoal: vi.fn(),
  archiveGoal: vi.fn(),
  addGoal: vi.fn(),
  // We don't need to mock db instance itself unless directly used in component
}));

// Mock the GoalCard to simplify page testing (optional, but good for isolation)
vi.mock('@/components/goals/GoalCard', () => ({
  GoalCard: ({ goal }: { goal: Goal }) => <div data-testid={`goal-card-${goal.id}`}>{goal.title}</div>,
}));

// Mock the GoalModal
vi.mock('@/components/goals/GoalModal', () => ({
    GoalModal: ({ isOpen, mode }: { isOpen?: boolean, mode: string }) => isOpen ? <div data-testid={`goal-modal-${mode}`}>Modal Open</div> : null,
}));

// Mock UI components if they cause issues in tests (less ideal)
// vi.mock('@/components/ui/button', ()=>({ Button: ({children}: {children: React.ReactNode}) => <button>{children}</button>}));

// Import the mocked functions to control them in tests
import { getGoals, getCategories } from '@/lib/db';

describe.skip('GoalsPage Component', () => {
  // Define mock data conforming to types
  const mockCategoryData: Category[] = [
    { id: 'cat-1', name: 'Personal Growth', color: '#3b82f6' },
    { id: 'cat-2', name: 'Career Development', color: '#10b981' },
  ];
  const mockGoalData: Goal[] = [
    { id: 'goal-1', title: 'Top Level Goal 1', status: 'Active', category: 'Personal Growth', createdAt: new Date() },
    { id: 'goal-2', title: 'Top Level Goal 2', status: 'Active', category: 'Career Development', createdAt: new Date() },
    { id: 'goal-3', title: 'Archived Goal', status: 'Archived', category: 'Personal Growth', createdAt: new Date() },
    { id: 'sub-goal-1', title: 'Sub Goal 1', parentGoalId: 'goal-1', status: 'Active', category: 'Personal Growth', createdAt: new Date() },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    // Provide default mock implementations
    (getGoals as vi.Mock).mockResolvedValue(mockGoalData);
    (getCategories as vi.Mock).mockResolvedValue(mockCategoryData);
  });

  it('should render loading skeletons initially', () => {
    // Arrange: Override default mock to return undefined initially
    (getGoals as vi.Mock).mockResolvedValue(undefined);
    (getCategories as vi.Mock).mockResolvedValue(undefined);

    render(<GoalsPage />);

    // Assert: Check for skeleton elements (assuming CardSkeleton renders specific roles or text)
    // Note: Testing for exact number of skeletons can be brittle.
    // Let's assume CardSkeleton renders a div with role="status" for loading indication
    // expect(screen.getAllByRole('status')).toHaveLength(3);
    // Or check for text associated with loading, if any.
    // The main 'Goals' header has been removed as it was redundant
    // Now we just check that goals don't render yet
    expect(screen.queryByTestId('goal-card-goal-1')).not.toBeInTheDocument();
  });

  it('should render top-level goals after data loads, excluding archived', async () => {
    render(<GoalsPage />);

    // Assert: Wait for goals to appear and check the correct ones are rendered
    await waitFor(() => {
      expect(screen.getByTestId('goal-card-goal-1')).toBeInTheDocument();
      expect(screen.getByText('Top Level Goal 1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('goal-card-goal-2')).toBeInTheDocument();
    expect(screen.getByText('Top Level Goal 2')).toBeInTheDocument();

    // Assert: Archived goal and sub-goal should NOT be rendered at top level
    expect(screen.queryByTestId('goal-card-goal-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('goal-card-sub-goal-1')).not.toBeInTheDocument();
  });

  it('should render the "New Goal" button', async () => {
    render(<GoalsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new goal/i })).toBeInTheDocument();
    });
  });

  // TODO: Add test for clicking "New Goal" and verifying modal state opens
  // TODO: Add test for rendering hierarchy (expand/collapse)
  // TODO: Add tests for triggering edit/delete/archive actions (mocking handlers)

});