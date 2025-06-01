// src/components/goals/DirectSubGoalButton.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DirectSubGoalButton } from './DirectSubGoalButton';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for API calls
global.fetch = vi.fn();

// Create a mock parent goal for testing
const mockParentGoal = {
  id: 'parent-goal-1',
  name: 'Parent Goal',
  description: 'Parent Goal Description',
  categoryId: 'cat-1',
  deadline: null,
  progress: 0,
  isArchived: false,
  userId: 'user-1',
  parentGoalId: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.location
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: mockReload
  },
  writable: true
});

describe.skip('DirectSubGoalButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true })
    });
  });

  it('should render the Add Sub-Goal button', () => {
    render(<DirectSubGoalButton parentGoal={mockParentGoal} />);

    // Check if the button is rendered
    const button = screen.getByTestId('add-sub-goal-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Add Sub-Goal');
  });

  it('should open the modal when the button is clicked', async () => {
    render(<DirectSubGoalButton parentGoal={mockParentGoal} />);

    // Find and click the button
    const button = screen.getByTestId('add-sub-goal-button');
    fireEvent.click(button);

    // Wait for the modal to open (due to setTimeout)
    await waitFor(() => {
      expect(screen.getByText('Create Sub-Goal')).toBeInTheDocument();
    });
  });

  it('should submit the form and create a sub-goal', async () => {
    const onSuccessMock = vi.fn();
    render(<DirectSubGoalButton parentGoal={mockParentGoal} onSuccess={onSuccessMock} />);

    // Open the modal
    const button = screen.getByTestId('add-sub-goal-button');
    fireEvent.click(button);

    // Wait for the modal to open
    await waitFor(() => {
      expect(screen.getByText('Create Sub-Goal')).toBeInTheDocument();
    });

    // Fill out the form
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: 'Test Sub-Goal' } });

    // Submit the form
    const submitButton = screen.getByText('Create Sub-Goal', { selector: 'button[type="submit"]' });
    fireEvent.click(submitButton);

    // Wait for the API call to complete
    await waitFor(() => {
      // Check if fetch was called with the correct data
      expect(global.fetch).toHaveBeenCalledWith('/api/goals/sub-goal', expect.any(Object));

      // Check if localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith('expandedGoalId', mockParentGoal.id);

      // Check if onSuccess callback was called
      expect(onSuccessMock).toHaveBeenCalled();

      // Check if page was reloaded
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('should handle form validation', async () => {
    render(<DirectSubGoalButton parentGoal={mockParentGoal} />);

    // Open the modal
    const button = screen.getByTestId('add-sub-goal-button');
    fireEvent.click(button);

    // Wait for the modal to open
    await waitFor(() => {
      expect(screen.getByText('Create Sub-Goal')).toBeInTheDocument();
    });

    // Try to submit without filling the required fields
    const submitButton = screen.getByText('Create Sub-Goal', { selector: 'button[type="submit"]' });
    fireEvent.click(submitButton);

    // The form should not be submitted
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
