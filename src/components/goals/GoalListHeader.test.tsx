// src/components/goals/GoalListHeader.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalListHeader } from './GoalListHeader';
import { describe, it, expect, vi } from 'vitest';

// Mock the NewGoalButton component
vi.mock('./NewGoalButton', () => ({
  NewGoalButton: vi.fn(() => <button data-testid="new-goal-button">New Goal</button>)
}));

describe('GoalListHeader Component', () => {
  const mockCategories = [
    { id: 'cat1', name: 'Work', color: '#ff0000' },
    { id: 'cat2', name: 'Personal', color: '#00ff00' }
  ];

  const mockParentGoals = [
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
      tasks: [],
      _count: { subGoals: 0 },
      subGoalCount: 0,
      completedTaskCount: 0,
      overdueTaskCount: 0
    }
  ];

  const mockToggleArchived = vi.fn();
  const mockToggleCompleted = vi.fn();

  it('should render the header with title', () => {
    render(
      <GoalListHeader
        showArchived={false}
        onToggleArchived={mockToggleArchived}
        showCompleted={false}
        onToggleCompleted={mockToggleCompleted}
        categories={mockCategories}
        parentGoals={mockParentGoals}
      />
    );

    expect(screen.getByText('Goals')).toBeInTheDocument();
  });

  it('should render "Completed Goals" title when in completed view', () => {
    render(
      <GoalListHeader
        showArchived={false}
        onToggleArchived={mockToggleArchived}
        showCompleted={true}
        onToggleCompleted={mockToggleCompleted}
        categories={mockCategories}
        parentGoals={mockParentGoals}
      />
    );

    expect(screen.getByText('Completed Goals')).toBeInTheDocument();
  });



  it('should call onToggleCompleted when completed button is clicked', () => {
    render(
      <GoalListHeader
        showArchived={false}
        onToggleArchived={mockToggleArchived}
        showCompleted={false}
        onToggleCompleted={mockToggleCompleted}
        categories={mockCategories}
        parentGoals={mockParentGoals}
      />
    );

    const completedButton = screen.getByText('View Completed');
    fireEvent.click(completedButton);

    expect(mockToggleCompleted).toHaveBeenCalledTimes(1);
  });

  it('should disable completed button when in archived view', () => {
    render(
      <GoalListHeader
        showArchived={true}
        onToggleArchived={mockToggleArchived}
        showCompleted={false}
        onToggleCompleted={mockToggleCompleted}
        categories={mockCategories}
        parentGoals={mockParentGoals}
      />
    );

    const completedButton = screen.getByText('View Completed');
    expect(completedButton).toBeDisabled();
  });
});
