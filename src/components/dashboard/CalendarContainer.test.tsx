import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarContainer } from './CalendarContainer';

// Mock the child components
vi.mock('./WeekView', () => ({
  WeekView: ({ tasks, currentDate, onDayClick }) => (
    <div data-testid="week-view">
      Week View
      <button onClick={() => onDayClick(new Date())}>Click Day</button>
    </div>
  ),
}));

vi.mock('./MonthView', () => ({
  MonthView: ({ tasks, currentDate, onDayClick }) => (
    <div data-testid="month-view">
      Month View
      <button onClick={() => onDayClick(new Date())}>Click Day</button>
    </div>
  ),
}));

vi.mock('./YearView', () => ({
  YearView: ({ tasks, currentDate }) => (
    <div data-testid="year-view">Year View</div>
  ),
}));

vi.mock('@/components/tasks/TaskModal', () => ({
  TaskModal: ({ isOpen, onOpenChange, onTaskCreated }) => (
    isOpen ? (
      <div data-testid="task-modal">
        Standard Task Modal
        <button onClick={() => onTaskCreated && onTaskCreated({ id: '123', name: 'Test Task' } as any)}>Create Task</button>
        <button onClick={() => onOpenChange && onOpenChange(false)}>Close</button>
      </div>
    ) : null
  ),
}));

vi.mock('./KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelp: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="keyboard-shortcuts-help">
        Keyboard Shortcuts Help
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    tasks: {
      add: vi.fn().mockResolvedValue('task-id'),
    },
  },
}));



describe('CalendarContainer', () => {
  const mockTasks = [
    { id: '1', title: 'Task 1', dueDate: new Date().toISOString() },
    { id: '2', title: 'Task 2', dueDate: new Date().toISOString() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the week view by default', () => {
    render(<CalendarContainer tasks={mockTasks} />);
    expect(screen.getByTestId('week-view')).toBeInTheDocument();
  });

  it('switches between views when buttons are clicked', () => {
    render(<CalendarContainer tasks={mockTasks} />);

    // Default is week view
    expect(screen.getByTestId('week-view')).toBeInTheDocument();

    // Switch to month view
    fireEvent.click(screen.getByText('Month'));
    expect(screen.getByTestId('month-view')).toBeInTheDocument();

    // Switch to year view
    fireEvent.click(screen.getByText('Year'));
    expect(screen.getByTestId('year-view')).toBeInTheDocument();

    // Switch back to week view
    fireEvent.click(screen.getByText('Week'));
    expect(screen.getByTestId('week-view')).toBeInTheDocument();
  });

  it('opens the standard task modal when add button is clicked', () => {
    render(<CalendarContainer tasks={mockTasks} />);

    // Click the add button
    fireEvent.click(screen.getByLabelText('Add new task'));

    // Modal should be open
    expect(screen.getByTestId('task-modal')).toBeInTheDocument();
  });

  it('opens the keyboard shortcuts help when help button is clicked', () => {
    render(<CalendarContainer tasks={mockTasks} />);

    // Click the help button
    fireEvent.click(screen.getByLabelText('Keyboard shortcuts help'));

    // Help dialog should be open
    expect(screen.getByTestId('keyboard-shortcuts-help')).toBeInTheDocument();
  });
});
