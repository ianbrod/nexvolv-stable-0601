import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReminderEditModal } from './ReminderEditModal';
import { useReminders } from '@/contexts/ReminderContext';
import * as goalsAndTasksActions from '@/actions/getGoalsAndTasks';

// Mock the useReminders hook
vi.mock('@/contexts/ReminderContext', () => ({
  useReminders: vi.fn(),
}));

// Mock the ReminderForm component
vi.mock('./ReminderForm', () => ({
  ReminderForm: ({ initialData, onFormSubmitSuccess, onCancel }: any) => (
    <div data-testid="mock-reminder-form">
      <div>Editing: {initialData?.title}</div>
      <button 
        onClick={onFormSubmitSuccess}
        data-testid="mock-form-submit"
      >
        Submit Form
      </button>
      <button 
        onClick={onCancel}
        data-testid="mock-form-cancel"
      >
        Cancel Form
      </button>
    </div>
  ),
}));

// Mock the getGoalsAndTasks action
vi.mock('@/actions/getGoalsAndTasks', () => ({
  getGoalsAndTasks: vi.fn(),
}));

describe('ReminderEditModal Component', () => {
  const mockOnClose = vi.fn();
  const mockRefreshReminders = vi.fn();
  
  // Mock data
  const mockReminder = {
    id: 'reminder1',
    title: 'Test Reminder',
    description: 'Test Description',
    dueDate: new Date(),
    isRecurring: false,
    status: 'PENDING',
    userId: 'user1',
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const mockGoalsAndTasks = {
    goals: [
      { id: 'goal1', title: 'Goal 1' },
      { id: 'goal2', title: 'Goal 2' },
    ],
    tasks: [
      { id: 'task1', title: 'Task 1' },
      { id: 'task2', title: 'Task 2' },
    ],
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      refreshReminders: mockRefreshReminders,
    });
    
    // Setup the mock implementation for getGoalsAndTasks
    (goalsAndTasksActions.getGoalsAndTasks as any).mockResolvedValue(mockGoalsAndTasks);
  });
  
  it('renders the modal when isOpen is true', async () => {
    render(
      <ReminderEditModal
        isOpen={true}
        onClose={mockOnClose}
        reminder={mockReminder}
      />
    );
    
    // Check if the modal title is rendered
    expect(screen.getByText('Edit Reminder')).toBeInTheDocument();
    
    // Initially should show loading state
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // After loading, should show the form
    await waitFor(() => {
      expect(screen.getByTestId('mock-reminder-form')).toBeInTheDocument();
      expect(screen.getByText(`Editing: ${mockReminder.title}`)).toBeInTheDocument();
    });
  });
  
  it('does not render the modal when isOpen is false', () => {
    render(
      <ReminderEditModal
        isOpen={false}
        onClose={mockOnClose}
        reminder={mockReminder}
      />
    );
    
    // Modal should not be in the document
    expect(screen.queryByText('Edit Reminder')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-reminder-form')).not.toBeInTheDocument();
  });
  
  it('fetches goals and tasks when opened', async () => {
    render(
      <ReminderEditModal
        isOpen={true}
        onClose={mockOnClose}
        reminder={mockReminder}
      />
    );
    
    // Check if getGoalsAndTasks was called
    await waitFor(() => {
      expect(goalsAndTasksActions.getGoalsAndTasks).toHaveBeenCalled();
    });
  });
  
  it('closes the modal and refreshes reminders when form is submitted', async () => {
    const user = userEvent.setup();
    
    render(
      <ReminderEditModal
        isOpen={true}
        onClose={mockOnClose}
        reminder={mockReminder}
      />
    );
    
    // Wait for the form to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-reminder-form')).toBeInTheDocument();
    });
    
    // Click the submit button on the mock form
    await user.click(screen.getByTestId('mock-form-submit'));
    
    // Check if onClose and refreshReminders were called
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockRefreshReminders).toHaveBeenCalled();
  });
  
  it('closes the modal when form is cancelled', async () => {
    const user = userEvent.setup();
    
    render(
      <ReminderEditModal
        isOpen={true}
        onClose={mockOnClose}
        reminder={mockReminder}
      />
    );
    
    // Wait for the form to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('mock-reminder-form')).toBeInTheDocument();
    });
    
    // Click the cancel button on the mock form
    await user.click(screen.getByTestId('mock-form-cancel'));
    
    // Check if onClose was called
    expect(mockOnClose).toHaveBeenCalled();
  });
});
