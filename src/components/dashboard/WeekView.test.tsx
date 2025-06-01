import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeekView } from './WeekView';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

// Mock the Dialog component
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
}));

describe('WeekView', () => {
  const currentDate = new Date(2023, 5, 15); // June 15, 2023
  const mockTasks = [
    {
      id: '1',
      title: 'Test Task 1',
      description: 'Description 1',
      status: 'Todo',
      priority: 'High',
      dueDate: new Date(2023, 5, 16).toISOString(), // June 16, 2023
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Test Task 2',
      description: 'Description 2',
      status: 'Completed',
      priority: 'Medium',
      dueDate: new Date(2023, 5, 17).toISOString(), // June 17, 2023
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders the week view with days of the week', () => {
    render(<WeekView tasks={mockTasks} currentDate={currentDate} />);
    
    // Get the days of the week for the current date
    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
    const endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Check if all days of the week are rendered
    weekDays.forEach(day => {
      const dayName = format(day, 'EEE');
      expect(screen.getByText(dayName)).toBeInTheDocument();
    });
    
    // Check if the weekly timeline is rendered
    expect(screen.getByTestId('weekly-timeline')).toBeInTheDocument();
  });

  it('displays tasks on the correct days', () => {
    render(<WeekView tasks={mockTasks} currentDate={currentDate} />);
    
    // Check if task titles are displayed
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    expect(screen.getByText('Test Task 2')).toBeInTheDocument();
  });

  it('opens task detail dialog when a task is clicked', () => {
    render(<WeekView tasks={mockTasks} currentDate={currentDate} />);
    
    // Click on a task
    fireEvent.click(screen.getByText('Test Task 1'));
    
    // Check if the dialog is opened with task details
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Test Task 1');
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('Description 1');
  });

  it('calls onDayClick when a day is clicked', () => {
    const onDayClick = vi.fn();
    render(<WeekView tasks={mockTasks} currentDate={currentDate} onDayClick={onDayClick} />);
    
    // Get all day columns (excluding the time column)
    const dayColumns = screen.getAllByRole('button', { name: /^.+, .+ \d+, \d+$/ });
    
    // Click on the first day
    fireEvent.click(dayColumns[0]);
    
    // Check if onDayClick was called
    expect(onDayClick).toHaveBeenCalledTimes(1);
    expect(onDayClick).toHaveBeenCalledWith(expect.any(Date));
  });
});
