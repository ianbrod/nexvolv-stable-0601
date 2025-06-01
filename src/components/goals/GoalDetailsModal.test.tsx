// src/components/goals/GoalDetailsModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalDetailsModal } from './GoalDetailsModal';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the GoalModal component
vi.mock('./GoalModal', () => ({
  GoalModal: vi.fn(({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mocked-goal-modal">
        <button data-testid="mock-close-button" onClick={onClose}>
          Close Modal
        </button>
      </div>
    );
  }),
}));

// Create a mock goal for testing
const mockGoal = {
  id: 'goal-1',
  name: 'Test Goal',
  description: 'Test Description',
  categoryId: 'cat-1',
  deadline: new Date('2024-12-31'),
  progress: 50,
  isArchived: false,
  userId: 'user-1',
  parentGoalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  timeframe: 'Quarter Goal',
  category: { id: 'cat-1', name: 'Work', color: '#ff0000' },
  tasks: [],
  _count: { subGoals: 2 },
  subGoalCount: 2,
  completedTaskCount: 3,
  overdueTaskCount: 1,
  tags: 'important,work,priority'
};

describe('GoalDetailsModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the goal details', () => {
    render(
      <GoalDetailsModal
        isOpen={true}
        onClose={() => {}}
        goal={mockGoal}
        categories={[]}
      />
    );

    // Check if the goal name is displayed
    expect(screen.getByText(mockGoal.name)).toBeInTheDocument();

    // Check if the description is displayed
    expect(screen.getByText(mockGoal.description)).toBeInTheDocument();
  });

  it('should display tags when they exist', () => {
    render(
      <GoalDetailsModal
        isOpen={true}
        onClose={() => {}}
        goal={mockGoal}
        categories={[]}
      />
    );

    // Check if the tags section is displayed
    expect(screen.getByText('Tags')).toBeInTheDocument();

    // Check if individual tags are displayed
    expect(screen.getByText('important')).toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
  });

  it('should not display tags section when no tags exist', () => {
    const goalWithoutTags = { ...mockGoal, tags: '' };

    render(
      <GoalDetailsModal
        isOpen={true}
        onClose={() => {}}
        goal={goalWithoutTags}
        categories={[]}
      />
    );

    // Check if the tags section is not displayed
    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });
});
