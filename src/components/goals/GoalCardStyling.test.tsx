// src/components/goals/GoalCardStyling.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GoalCard } from './GoalCard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoalCardData } from './types';



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

// Define a mock sub-goal
const mockSubGoal: GoalCardData = {
  ...mockGoal,
  id: 'goal-test-sub',
  name: 'Test Sub-Goal',
  parentGoalId: 'goal-test-1',
  subGoalCount: 0
};

// Define a mock goal with different progress levels
const mockLowProgressGoal: GoalCardData = {
  ...mockGoal,
  id: 'goal-test-low',
  progress: 20
};

const mockHighProgressGoal: GoalCardData = {
  ...mockGoal,
  id: 'goal-test-high',
  progress: 80
};

const mockCompleteGoal: GoalCardData = {
  ...mockGoal,
  id: 'goal-test-complete',
  progress: 100
};

describe('GoalCard Styling', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should apply correct border styling for regular goals', () => {
    const { container } = render(<GoalCard goal={mockGoal} isCompletedView={false} />);
    const cardElement = container.querySelector('div[data-goal-id]');

    expect(cardElement).toHaveAttribute('style');
    const style = cardElement?.getAttribute('style') || '';
    expect(style).toContain('border-left-width: 4px');
    expect(style).toContain('border-left-color: #ff0000');
    expect(style).toContain('border-left-style: solid');
    expect(style).toContain('border-top-style: solid');
    expect(style).toContain('border-right-style: solid');
    expect(style).toContain('border-bottom-style: solid');
  });

  it('should apply correct border styling for sub-goals', () => {
    const { container } = render(<GoalCard goal={mockSubGoal} isCompletedView={false} />);
    const cardElement = container.querySelector('div[data-goal-id]');

    expect(cardElement).toHaveStyle({
      borderTopStyle: 'dashed',
      borderBottomStyle: 'dashed'
    });
    expect(cardElement).toHaveAttribute('data-is-subgoal', 'true');
  });

  it('should apply correct styling for goals with sub-goals', () => {
    const { container } = render(<GoalCard goal={mockGoal} hasSubGoals={true} isCompletedView={false} />);
    const cardElement = container.querySelector('div[data-goal-id]');

    expect(cardElement).toHaveAttribute('data-has-subgoals', 'true');
    expect(cardElement).toHaveStyle({
      backgroundColor: 'rgba(var(--primary-rgb), 0.03)'
    });
  });

  it('should render the goal name with correct typography', () => {
    render(<GoalCard goal={mockGoal} isCompletedView={false} />);
    const nameElement = screen.getByText('Test Goal Name');

    expect(nameElement).toBeInTheDocument();
    expect(nameElement.closest('h3')).toHaveClass('text-lg', 'font-semibold');
  });

  it('should render the sub-goal name with correct typography', () => {
    render(<GoalCard goal={mockSubGoal} isCompletedView={false} />);
    const nameElement = screen.getByText('Test Sub-Goal');

    expect(nameElement).toBeInTheDocument();
    expect(nameElement.closest('h3')).toHaveClass('text-base', 'font-semibold');
  });

  it('should render badges with correct styling', () => {
    render(<GoalCard goal={mockGoal} isCompletedView={false} />);

    const tasksBadge = screen.getByText(/Tasks/i);
    const subgoalsBadge = screen.getByText(/3 Sub-goal/);
    const overdueBadge = screen.getByText(/2 Overdue/);

    expect(tasksBadge).toHaveClass('font-medium');
    expect(subgoalsBadge).toHaveClass('font-medium');
    expect(overdueBadge).toHaveClass('font-medium');
  });

  it('should apply completed view styling when in completed view', () => {
    const { container } = render(<GoalCard goal={mockCompleteGoal} isCompletedView={true} />);
    const cardElement = container.querySelector('div[data-goal-id]');

    expect(cardElement).toHaveAttribute('data-completed-view', 'true');
    expect(cardElement).toHaveAttribute('data-completed', 'true');
  });
});
