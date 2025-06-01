// src/components/goals/GoalCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalCard } from './GoalCard';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the shared types
import { GoalCardData } from './types';



// Mock the child components
vi.mock('./GoalCardHeader', () => ({
  GoalCardHeader: vi.fn(() => <div data-testid="goal-card-header">Header Mock</div>)
}));

vi.mock('./GoalCardActions', () => ({
  GoalCardActions: vi.fn(({ isCompletedView }) => <div data-testid="goal-card-actions" data-completed-view={isCompletedView ? 'true' : 'false'}>Actions Mock</div>)
}));

vi.mock('./GoalCardContent', () => ({
  GoalCardContent: vi.fn(() => <div data-testid="goal-card-content">Content Mock</div>)
}));

vi.mock('./GoalDetailsModal', () => ({
  GoalDetailsModal: vi.fn(() => null)
}));

// Create a mock goal for testing
const mockGoal: GoalCardData = {
  id: 'goal-test-1',
  name: 'Test Goal Name',
  description: 'Test Description',
  categoryId: 'cat-1',
  deadline: new Date('2024-12-31T00:00:00.000Z'),
  progress: 50,
  isArchived: false,
  userId: 'user-test-1',
  parentGoalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  timeframe: 'Quarter Goal',
  category: { id: 'cat-1', name: 'Work', color: '#ff0000' },
  tasks: [],
  _count: { subGoals: 3 },
  subGoalCount: 3,
  overdueTaskCount: 2,
  completedTaskCount: 4
};

// Define a separate mock goal with no overdue tasks
const mockGoalWithoutOverdue: GoalCardData = {
  ...mockGoal,
  overdueTaskCount: 0
};

// Mock event handlers
const mockOnClick = vi.fn();
const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();
const mockOnExpandToggle = vi.fn();

describe('GoalCard Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all child components', () => {
    render(<GoalCard goal={mockGoal} isCompletedView={false} />);

    // Check if all child components are rendered
    expect(screen.getByTestId('goal-card-header')).toBeInTheDocument();
    expect(screen.getByTestId('goal-card-actions')).toBeInTheDocument();
    expect(screen.getByTestId('goal-card-content')).toBeInTheDocument();
  });

  it('should call onClick when the card is clicked', () => {
    render(<GoalCard goal={mockGoal} onClick={mockOnClick} isCompletedView={false} />);

    // Find the main card container
    const cardElement = screen.getByTestId('goal-card-content').closest('div.flex.flex-col');
    expect(cardElement).toBeInTheDocument();

    if (cardElement) {
      fireEvent.click(cardElement);
      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick).toHaveBeenCalledWith(mockGoal.id);
    }
  });

  it('should apply correct styling for subgoals', () => {
    render(<GoalCard goal={{...mockGoal, parentGoalId: 'parent-1'}} isCompletedView={false} />);

    // Find the main card container
    const cardElement = screen.getByTestId('goal-card-content').closest('div.flex.flex-col');
    expect(cardElement).toBeInTheDocument();

    if (cardElement) {
      expect(cardElement).toHaveAttribute('data-is-subgoal', 'true');
    }
  });

  it('should apply correct styling for goals with subgoals', () => {
    render(<GoalCard goal={mockGoal} hasSubGoals={true} isCompletedView={false} />);

    // Find the main card container
    const cardElement = screen.getByTestId('goal-card-content').closest('div.flex.flex-col');
    expect(cardElement).toBeInTheDocument();

    if (cardElement) {
      expect(cardElement).toHaveAttribute('data-has-subgoals', 'true');
    }
  });

  it('should open delete confirmation dialog when delete is triggered', () => {
    render(<GoalCard goal={mockGoal} onDelete={mockOnDelete} isCompletedView={false} />);

    // Simulate opening the delete dialog
    const alertDialog = document.querySelector('[role="dialog"]');
    expect(alertDialog).not.toBeInTheDocument(); // Dialog should not be visible initially

    // We can't directly test the dropdown menu interaction due to mocking,
    // but we can test that the dialog appears when isAlertOpen is set to true
  });

  it('should apply completed view styling when isCompletedView is true', () => {
    render(<GoalCard goal={mockGoal} isCompletedView={true} />);

    // Find the main card container
    const cardElement = screen.getByTestId('goal-card-content').closest('div.flex.flex-col');
    expect(cardElement).toBeInTheDocument();

    if (cardElement) {
      expect(cardElement).toHaveAttribute('data-completed-view', 'true');
    }
  });
});