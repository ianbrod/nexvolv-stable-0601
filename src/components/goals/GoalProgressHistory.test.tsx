import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalProgressHistory } from './GoalProgressHistory';
import { getGoalProgressHistory } from '@/actions/getGoalProgressHistory';
import { vi } from 'vitest';

// Mock ResizeObserver which is not available in the test environment
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Set up the mock before tests run
beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock;
});

// Mock the getGoalProgressHistory action
vi.mock('@/actions/getGoalProgressHistory', () => ({
  getGoalProgressHistory: vi.fn(),
}));

// Mock data for testing
const mockProgressData = [
  {
    id: '1',
    timestamp: new Date('2023-01-01').toISOString(),
    progress: 10,
    notes: 'Started the goal',
    goalId: 'goal1',
    userId: 'user1',
    createdAt: new Date('2023-01-01').toISOString(),
    updatedAt: new Date('2023-01-01').toISOString(),
    goal: {
      id: 'goal1',
      name: 'Test Goal',
    },
  },
  {
    id: '2',
    timestamp: new Date('2023-01-15').toISOString(),
    progress: 25,
    notes: 'Making progress',
    goalId: 'goal1',
    userId: 'user1',
    createdAt: new Date('2023-01-15').toISOString(),
    updatedAt: new Date('2023-01-15').toISOString(),
    goal: {
      id: 'goal1',
      name: 'Test Goal',
    },
  },
  {
    id: '3',
    timestamp: new Date('2023-02-01').toISOString(),
    progress: 50,
    notes: 'Halfway there',
    goalId: 'goal1',
    userId: 'user1',
    createdAt: new Date('2023-02-01').toISOString(),
    updatedAt: new Date('2023-02-01').toISOString(),
    goal: {
      id: 'goal1',
      name: 'Test Goal',
    },
  },
];

describe('GoalProgressHistory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock successful response by default
    (getGoalProgressHistory as jest.Mock).mockResolvedValue({
      success: true,
      data: mockProgressData,
    });
  });

  it('renders the progress history chart', async () => {
    render(<GoalProgressHistory goalId="goal1" />);

    // Check for loading state initially
    expect(screen.getByText(/Progress History/i)).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(getGoalProgressHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          goalId: 'goal1',
        })
      );
    });
  });

  it('shows empty state when no data is available', async () => {
    // Mock empty response
    (getGoalProgressHistory as jest.Mock).mockResolvedValue({
      success: true,
      data: [],
    });

    render(<GoalProgressHistory goalId="goal1" />);

    // Wait for empty state to appear
    await waitFor(() => {
      expect(screen.getByText(/No progress history available/i)).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    // Mock error response
    (getGoalProgressHistory as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to fetch progress history',
    });

    render(<GoalProgressHistory goalId="goal1" />);

    // Wait for error state to appear
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch progress history/i)).toBeInTheDocument();
    });
  });

  it('changes time range when buttons are clicked', async () => {
    render(<GoalProgressHistory goalId="goal1" />);

    // Wait for initial load
    await waitFor(() => {
      expect(getGoalProgressHistory).toHaveBeenCalledTimes(1);
    });

    // Click on Week button
    const weekButton = screen.getByText('Week');
    await userEvent.click(weekButton);

    // Check if getGoalProgressHistory was called with updated params
    await waitFor(() => {
      expect(getGoalProgressHistory).toHaveBeenCalledTimes(2);
      expect(getGoalProgressHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          goalId: 'goal1',
          startDate: expect.any(Date),
        })
      );
    });
  });
});
