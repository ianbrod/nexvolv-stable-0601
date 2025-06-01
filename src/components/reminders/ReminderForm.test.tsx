import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReminderForm } from './ReminderForm';
import { useReminders } from '@/contexts/ReminderContext';
import { addDays } from 'date-fns';

// Mock the useReminders hook
vi.mock('@/contexts/ReminderContext', () => ({
  useReminders: vi.fn(),
}));

// Mock the EditableSingleClickDateTimePicker component
vi.mock('@/components/ui/EditableSingleClickDateTimePicker', () => ({
  EditableSingleClickDateTimePicker: ({ value, onChange }: any) => (
    <div data-testid="mock-date-picker">
      <span>Selected: {value ? value.toISOString() : 'none'}</span>
      <button
        onClick={() => onChange(addDays(new Date(), 1))}
        data-testid="mock-date-picker-button"
      >
        Select Tomorrow
      </button>
    </div>
  ),
}));

describe('ReminderForm Component', () => {
  const mockOnFormSubmitSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockAddReminder = vi.fn();
  const mockUpdateReminder = vi.fn();

  // Mock data
  const mockGoals = [
    { id: 'goal1', title: 'Goal 1' },
    { id: 'goal2', title: 'Goal 2' },
  ];

  const mockTasks = [
    { id: 'task1', title: 'Task 1' },
    { id: 'task2', title: 'Task 2' },
  ];

  const mockInitialData = {
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

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      addReminder: mockAddReminder.mockResolvedValue({ success: true }),
      updateReminder: mockUpdateReminder.mockResolvedValue({ success: true }),
    });
  });

  it('renders the form with empty fields for new reminder', () => {
    render(
      <ReminderForm
        onFormSubmitSuccess={mockOnFormSubmitSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Check if form elements are rendered
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-date-picker')).toBeInTheDocument();
    expect(screen.getByLabelText(/recurring/i)).toBeInTheDocument();

    // Check buttons
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('pre-fills form fields when editing an existing reminder', () => {
    render(
      <ReminderForm
        initialData={mockInitialData}
        onFormSubmitSuccess={mockOnFormSubmitSuccess}
        onCancel={mockOnCancel}
        isEditing={true}
      />
    );

    // Check if form elements are pre-filled
    expect(screen.getByLabelText(/title/i)).toHaveValue('Test Reminder');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Test Description');

    // Check if the date picker has the initial date
    expect(screen.getByTestId('mock-date-picker')).toHaveTextContent(
      mockInitialData.dueDate.toISOString()
    );

    // Check if the recurring checkbox is unchecked
    expect(screen.getByLabelText(/recurring/i)).not.toBeChecked();
  });

  it('shows recurrence options when recurring checkbox is checked', async () => {
    const user = userEvent.setup();

    render(
      <ReminderForm
        onFormSubmitSuccess={mockOnFormSubmitSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Initially, recurrence options should not be visible
    expect(screen.queryByLabelText(/recurrence pattern/i)).not.toBeInTheDocument();

    // Check the recurring checkbox
    const recurringCheckbox = screen.getByLabelText(/recurring/i);
    await user.click(recurringCheckbox);

    // Now recurrence options should be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/recurrence pattern/i)).toBeInTheDocument();
    });
  });

  it('submits the form with correct data for a new reminder', async () => {
    const user = userEvent.setup();

    render(
      <ReminderForm
        onFormSubmitSuccess={mockOnFormSubmitSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Fill in the form
    await user.type(screen.getByLabelText(/title/i), 'New Test Reminder');
    await user.type(screen.getByLabelText(/description/i), 'New Test Description');

    // Select a date using the mock date picker
    await user.click(screen.getByTestId('mock-date-picker-button'));

    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Check if addReminder was called with correct data
    await waitFor(() => {
      expect(mockAddReminder).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Test Reminder',
        description: 'New Test Description',
        isRecurring: false,
      }));
      expect(mockOnFormSubmitSuccess).toHaveBeenCalled();
    });
  });

  it('submits the form with correct data for editing a reminder', async () => {
    const user = userEvent.setup();

    render(
      <ReminderForm
        initialData={mockInitialData}
        onFormSubmitSuccess={mockOnFormSubmitSuccess}
        onCancel={mockOnCancel}
        isEditing={true}
      />
    );

    // Modify the form
    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), 'Updated Reminder');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Check if updateReminder was called with correct data
    await waitFor(() => {
      expect(mockUpdateReminder).toHaveBeenCalledWith(
        'reminder1',
        expect.objectContaining({
          title: 'Updated Reminder',
        })
      );
      expect(mockOnFormSubmitSuccess).toHaveBeenCalled();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ReminderForm
        onFormSubmitSuccess={mockOnFormSubmitSuccess}
        onCancel={mockOnCancel}
      />
    );

    // Click the cancel button
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Check if onCancel was called
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
