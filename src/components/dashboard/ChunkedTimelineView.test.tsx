import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChunkedTimelineView } from './ChunkedTimelineView';
import { Task } from '@/types';

// Mock the react-window components
vi.mock('react-window', () => ({
  VariableSizeList: ({ children, itemCount }: { children: any, itemCount: number }) => {
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(children({ index: i, style: {} }));
    }
    return <div data-testid="variable-size-list">{items}</div>;
  }
}));

// Mock the DateHeader component
vi.mock('./DateHeader', () => ({
  DateHeader: ({ date, count }: { date: string, count: number }) => (
    <div data-testid="date-header">
      {date} ({count} items)
    </div>
  )
}));

// Mock the TimelineItem component
vi.mock('./TimelineItem', () => ({
  TimelineItem: ({ task }: { task: Task }) => (
    <div data-testid={`timeline-item-${task.id}`}>
      {task.name}
    </div>
  )
}));

// Mock the TimelineErrorBoundary component
vi.mock('./TimelineErrorBoundary', () => ({
  TimelineErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="timeline-error-boundary">{children}</div>
  )
}));

describe('ChunkedTimelineView', () => {
  // Sample tasks for testing
  const sampleTasks: Task[] = [
    {
      id: '1',
      name: 'Task 1',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: new Date('2023-06-15'),
    },
    {
      id: '2',
      name: 'Task 2',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date('2023-06-15'),
    },
    {
      id: '3',
      name: 'Task 3',
      priority: 'LOW',
      status: 'COMPLETED',
      dueDate: new Date('2023-06-16'),
    },
    {
      id: '4',
      name: 'Task 4',
      priority: 'MEDIUM',
      status: 'TODO',
      // No due date
    },
  ];

  it('renders the component with title', () => {
    render(<ChunkedTimelineView tasks={sampleTasks} title="My Timeline" />);
    expect(screen.getByText('My Timeline')).toBeInTheDocument();
  });

  it('renders the error boundary', () => {
    render(<ChunkedTimelineView tasks={sampleTasks} />);
    expect(screen.getByTestId('timeline-error-boundary')).toBeInTheDocument();
  });

  it('renders date headers and timeline items', () => {
    render(<ChunkedTimelineView tasks={sampleTasks} />);
    
    // Should have at least one date header
    expect(screen.getAllByTestId('date-header').length).toBeGreaterThan(0);
    
    // Should render all tasks
    expect(screen.getByTestId('timeline-item-1')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-item-3')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-item-4')).toBeInTheDocument();
  });

  it('renders empty state when no tasks are provided', () => {
    render(<ChunkedTimelineView tasks={[]} />);
    expect(screen.getByText('No tasks to display')).toBeInTheDocument();
  });

  it('renders with controls when showControls is true', () => {
    render(<ChunkedTimelineView tasks={sampleTasks} showControls={true} />);
    
    // Should have group by and sort controls
    expect(screen.getByText('Group by')).toBeInTheDocument();
    expect(screen.getByText('Sort')).toBeInTheDocument();
  });

  it('does not render controls when showControls is false', () => {
    render(<ChunkedTimelineView tasks={sampleTasks} showControls={false} />);
    
    // Should not have group by and sort controls
    expect(screen.queryByText('Group by')).not.toBeInTheDocument();
    expect(screen.queryByText('Sort')).not.toBeInTheDocument();
  });
});
