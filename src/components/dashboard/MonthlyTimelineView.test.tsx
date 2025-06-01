import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthlyTimelineView } from './MonthlyTimelineView';
import { Task } from '@/types';
import * as dateFns from 'date-fns';

// Mock the ChunkedTimelineView component
vi.mock('./ChunkedTimelineView', () => ({
  ChunkedTimelineView: ({ tasks }: { tasks: Task[] }) => (
    <div data-testid="chunked-timeline">
      {tasks.map(task => (
        <div key={task.id}>{task.name}</div>
      ))}
    </div>
  )
}));

// Mock the TimelineErrorBoundary component
vi.mock('./TimelineErrorBoundary', () => ({
  TimelineErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="timeline-error-boundary">{children}</div>
  )
}));

describe('MonthlyTimelineView', () => {
  // Sample tasks for testing
  const today = new Date();
  const tomorrow = dateFns.addDays(today, 1);
  const nextWeek = dateFns.addDays(today, 7);
  
  const sampleTasks: Task[] = [
    {
      id: '1',
      name: 'Task 1',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: today,
    },
    {
      id: '2',
      name: 'Task 2',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: tomorrow,
    },
    {
      id: '3',
      name: 'Task 3',
      priority: 'LOW',
      status: 'COMPLETED',
      dueDate: nextWeek,
    },
    {
      id: '4',
      name: 'Task 4',
      priority: 'MEDIUM',
      status: 'TODO',
      // No due date
    },
  ];

  it('renders the component with current month title', () => {
    render(<MonthlyTimelineView tasks={sampleTasks} />);
    
    // Should show the current month and year
    expect(screen.getByText(dateFns.format(today, 'MMMM yyyy'))).toBeInTheDocument();
  });

  it('renders the error boundary', () => {
    render(<MonthlyTimelineView tasks={sampleTasks} />);
    expect(screen.getByTestId('timeline-error-boundary')).toBeInTheDocument();
  });

  it('renders day names in the header', () => {
    render(<MonthlyTimelineView tasks={sampleTasks} />);
    
    // Should show all day names
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('navigates to previous month when previous button is clicked', () => {
    render(<MonthlyTimelineView tasks={sampleTasks} />);
    
    // Get the current month title
    const initialTitle = screen.getByText(dateFns.format(today, 'MMMM yyyy'));
    
    // Click the previous month button
    const prevButton = screen.getByRole('button', { name: /chevronleft/i });
    fireEvent.click(prevButton);
    
    // Should show the previous month
    const previousMonth = dateFns.subMonths(today, 1);
    expect(screen.getByText(dateFns.format(previousMonth, 'MMMM yyyy'))).toBeInTheDocument();
    
    // Initial title should no longer be in the document
    expect(initialTitle).not.toBeInTheDocument();
  });

  it('navigates to next month when next button is clicked', () => {
    render(<MonthlyTimelineView tasks={sampleTasks} />);
    
    // Get the current month title
    const initialTitle = screen.getByText(dateFns.format(today, 'MMMM yyyy'));
    
    // Click the next month button
    const nextButton = screen.getByRole('button', { name: /chevronright/i });
    fireEvent.click(nextButton);
    
    // Should show the next month
    const nextMonth = dateFns.addMonths(today, 1);
    expect(screen.getByText(dateFns.format(nextMonth, 'MMMM yyyy'))).toBeInTheDocument();
    
    // Initial title should no longer be in the document
    expect(initialTitle).not.toBeInTheDocument();
  });

  it('shows tasks for a day when a day is clicked', () => {
    render(<MonthlyTimelineView tasks={sampleTasks} />);
    
    // Find the day cell for today (which has Task 1)
    const todayCell = screen.getByText('1 task');
    
    // Click on the day
    fireEvent.click(todayCell.parentElement!.parentElement!);
    
    // Should show the tasks for today
    expect(screen.getByText(`Tasks for ${dateFns.format(today, 'EEEE, MMMM d, yyyy')}`)).toBeInTheDocument();
    
    // Should render the chunked timeline with today's tasks
    expect(screen.getByTestId('chunked-timeline')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
});
