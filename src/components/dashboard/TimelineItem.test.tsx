import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineItem } from './TimelineItem';
import { Task } from '@/types';

// Mock the icons to avoid issues with Lucide in tests
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  ListTodo: () => <div data-testid="list-todo-icon">ListTodo</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  Repeat: () => <div data-testid="repeat-icon">Repeat</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  CheckCircle2: () => <div data-testid="check-circle-icon">CheckCircle2</div>,
  Flag: () => <div data-testid="flag-icon">Flag</div>,
  Timer: () => <div data-testid="timer-icon">Timer</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Goal: () => <div data-testid="goal-icon">Goal</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
}));

describe('TimelineItem', () => {
  // Sample tasks for testing
  const todoTask: Task = {
    id: '1',
    name: 'Task 1',
    description: 'This is a sample task description',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: new Date('2099-12-31'), // Future date
  };

  const inProgressTask: Task = {
    id: '2',
    name: 'Task 2',
    description: 'This is an in-progress task',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: new Date('2099-12-31'), // Future date
  };

  const completedTask: Task = {
    id: '3',
    name: 'Task 3',
    description: 'This is a completed task',
    priority: 'LOW',
    status: 'COMPLETED',
    completedAt: new Date(),
    dueDate: new Date('2099-12-31'), // Future date
  };

  const overdueTask: Task = {
    id: '4',
    name: 'Overdue Task',
    description: 'This task is overdue',
    priority: 'HIGH',
    status: 'TODO',
    dueDate: new Date('2020-01-01'), // Past date
  };

  const recurringTask: Task = {
    id: '5',
    name: 'Recurring Task',
    description: 'This is a recurring task',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: new Date('2099-12-31'), // Future date
    recurrencePattern: 'WEEKLY',
  };

  it('renders the task name correctly', () => {
    render(<TimelineItem task={todoTask} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('renders the task description', () => {
    render(<TimelineItem task={todoTask} />);
    expect(screen.getByText('This is a sample task description')).toBeInTheDocument();
  });

  it('renders the priority badge', () => {
    render(<TimelineItem task={todoTask} />);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('renders the task icon', () => {
    render(<TimelineItem task={todoTask} />);
    expect(screen.getByTestId('list-todo-icon')).toBeInTheDocument();
  });

  it('shows the in-progress badge for in-progress tasks', () => {
    render(<TimelineItem task={inProgressTask} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows the completed badge for completed tasks', () => {
    render(<TimelineItem task={completedTask} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows the overdue badge for overdue tasks', () => {
    render(<TimelineItem task={overdueTask} />);
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('shows the recurring badge for recurring tasks', () => {
    render(<TimelineItem task={recurringTask} />);
    expect(screen.getByText('Recurring')).toBeInTheDocument();
  });

  it('expands and collapses when the expand button is clicked', () => {
    render(<TimelineItem task={todoTask} />);
    
    // Initially, the description should be truncated (not expanded)
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    
    // Click the expand button
    fireEvent.click(screen.getByLabelText('Expand details'));
    
    // Now the chevron should be pointing up
    expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
    
    // Click again to collapse
    fireEvent.click(screen.getByLabelText('Collapse details'));
    
    // Chevron should be pointing down again
    expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<TimelineItem task={todoTask} onClick={handleClick} />);
    
    // Click the timeline item
    fireEvent.click(screen.getByTestId(`timeline-item-${todoTask.id}`));
    
    // Check if the handler was called with the task
    expect(handleClick).toHaveBeenCalledWith(todoTask);
  });

  it('applies selected styling when isSelected is true', () => {
    render(<TimelineItem task={todoTask} isSelected={true} />);
    
    // Check if the selected class is applied
    const timelineItem = screen.getByTestId(`timeline-item-${todoTask.id}`);
    expect(timelineItem.className).toContain('ring-2');
    expect(timelineItem.className).toContain('ring-primary');
  });

  it('renders proxy item with simplified view', () => {
    render(<TimelineItem task={todoTask} isProxy={true} />);
    
    // Should show the proxy indicator
    expect(screen.getByText('[proxy]')).toBeInTheDocument();
    expect(screen.getByText('Click to load full details')).toBeInTheDocument();
  });
});
