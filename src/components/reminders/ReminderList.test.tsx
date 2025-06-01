import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReminderList } from './ReminderList';
import { useReminders } from '@/contexts/ReminderContext';
import { Reminder } from '@/types';
import { addDays } from 'date-fns';

// Mock the useReminders hook
vi.mock('@/contexts/ReminderContext', () => ({
  useReminders: vi.fn(),
}));

// Mock the ReminderForm component
vi.mock('./ReminderForm', () => ({
  ReminderForm: ({ onFormSubmitSuccess, onCancel }: any) => (
    <div data-testid="mock-reminder-form">
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

// Mock the ReminderEditModal component
vi.mock('./ReminderEditModal', () => ({
  ReminderEditModal: ({ isOpen, onClose, reminder }: any) => (
    isOpen ? (
      <div data-testid="mock-edit-modal">
        <div>Editing: {reminder?.title}</div>
        <button 
          onClick={onClose}
          data-testid="mock-modal-close"
        >
          Close Modal
        </button>
      </div>
    ) : null
  ),
}));

describe('ReminderList Component', () => {
  // Mock data
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  
  const mockReminders: Reminder[] = [
    {
      id: 'reminder1',
      title: 'Test Reminder 1',
      description: 'Test Description 1',
      dueDate: tomorrow,
      isRecurring: false,
      status: 'PENDING',
      userId: 'user1',
      isCompleted: false,
      createdAt: today,
      updatedAt: today,
    },
    {
      id: 'reminder2',
      title: 'Test Reminder 2',
      description: 'Test Description 2',
      dueDate: nextWeek,
      isRecurring: true,
      recurrence: 'weekly',
      status: 'PENDING',
      userId: 'user1',
      isCompleted: false,
      createdAt: today,
      updatedAt: today,
    },
  ];
  
  const mockRefreshReminders = vi.fn();
  const mockDeleteReminder = vi.fn();
  const mockCompleteReminderItem = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the list of reminders', async () => {
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: mockReminders,
      refreshReminders: mockRefreshReminders,
      isLoading: false,
      error: null,
      deleteReminder: mockDeleteReminder,
      completeReminderItem: mockCompleteReminderItem,
    });
    
    render(<ReminderList />);
    
    // Check if the title is rendered
    expect(screen.getByText('Reminders')).toBeInTheDocument();
    
    // Check if the reminders are rendered
    expect(screen.getByText('Test Reminder 1')).toBeInTheDocument();
    expect(screen.getByText('Test Reminder 2')).toBeInTheDocument();
    
    // Check if the add button is rendered
    expect(screen.getByRole('button', { name: /add reminder/i })).toBeInTheDocument();
  });
  
  it('shows loading state when isLoading is true', () => {
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: [],
      refreshReminders: mockRefreshReminders,
      isLoading: true,
      error: null,
    });
    
    render(<ReminderList />);
    
    // Check if loading indicator is shown
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  
  it('shows error state when there is an error', () => {
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: [],
      refreshReminders: mockRefreshReminders,
      isLoading: false,
      error: 'Failed to load reminders',
    });
    
    render(<ReminderList />);
    
    // Check if error message is shown
    expect(screen.getByText(/failed to load reminders/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
  
  it('shows empty state when there are no reminders', () => {
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: [],
      refreshReminders: mockRefreshReminders,
      isLoading: false,
      error: null,
    });
    
    render(<ReminderList />);
    
    // Check if empty state message is shown
    expect(screen.getByText(/no reminders found/i)).toBeInTheDocument();
  });
  
  it('opens the add reminder modal when add button is clicked', async () => {
    const user = userEvent.setup();
    
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: mockReminders,
      refreshReminders: mockRefreshReminders,
      isLoading: false,
      error: null,
    });
    
    render(<ReminderList />);
    
    // Click the add button
    await user.click(screen.getByRole('button', { name: /add reminder/i }));
    
    // Check if the modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('mock-reminder-form')).toBeInTheDocument();
    });
  });
  
  it('opens the edit modal when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: mockReminders,
      refreshReminders: mockRefreshReminders,
      isLoading: false,
      error: null,
    });
    
    render(<ReminderList />);
    
    // Find and click the edit button for the first reminder
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editButtons[0]);
    
    // Check if the edit modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('mock-edit-modal')).toBeInTheDocument();
      expect(screen.getByText(`Editing: ${mockReminders[0].title}`)).toBeInTheDocument();
    });
  });
  
  it('calls deleteReminder when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: mockReminders,
      refreshReminders: mockRefreshReminders,
      isLoading: false,
      error: null,
      deleteReminder: mockDeleteReminder.mockResolvedValue({ success: true }),
    });
    
    render(<ReminderList />);
    
    // Find and click the delete button for the first reminder
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);
    
    // Check if deleteReminder was called with the correct ID
    await waitFor(() => {
      expect(mockDeleteReminder).toHaveBeenCalledWith('reminder1');
    });
  });
  
  it('calls completeReminderItem when complete button is clicked', async () => {
    const user = userEvent.setup();
    
    // Setup the mock implementation for useReminders
    (useReminders as any).mockReturnValue({
      reminders: mockReminders,
      refreshReminders: mockRefreshReminders,
      isLoading: false,
      error: null,
      completeReminderItem: mockCompleteReminderItem.mockResolvedValue({ success: true }),
    });
    
    render(<ReminderList />);
    
    // Find and click the complete button for the first reminder
    const completeButtons = screen.getAllByRole('button', { name: /complete/i });
    await user.click(completeButtons[0]);
    
    // Check if completeReminderItem was called with the correct ID
    await waitFor(() => {
      expect(mockCompleteReminderItem).toHaveBeenCalledWith('reminder1');
    });
  });
});
