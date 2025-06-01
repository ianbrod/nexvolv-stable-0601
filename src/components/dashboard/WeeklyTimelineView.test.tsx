import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeeklyTimelineView } from './WeeklyTimelineView';
import { Task } from '@/types';
import * as dateFns from 'date-fns';

// Mock the virtualized components
vi.mock('./VirtualizedTimelineWrapper', () => ({
  VirtualizedTimelineWrapper: ({ tasks }: { tasks: Task[] }) => (
    <div data-testid="virtualized-timeline">
      {tasks.map(task => (
        <div key={task.id}>{task.name || task.title}</div>
      ))}
    </div>
  )
}));

vi.mock('./TimelineErrorBoundary', () => ({
  TimelineErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="timeline-error-boundary">{children}</div>
  )
}));

// Mock date-fns to control the current date
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    startOfWeek: vi.fn(),
    endOfWeek: vi.fn(),
    isSameDay: vi.fn().mockImplementation(() => false),
  };
});

describe('WeeklyTimelineView', () => {
  // Setup mock data
  const mockTasks: Task[] = [
    {
      id: '1',
      name: 'Task 1',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: new Date('2023-06-15'),
      createdAt: new Date('2023-06-10'),
    },
    {
      id: '2',
      name: 'Task 2',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date('2023-06-16'),
      createdAt: new Date('2023-06-11'),
    },
    {
      id: '3',
      name: 'Task 3',
      priority: 'LOW',
      status: 'COMPLETED',
      dueDate: new Date('2023-06-17'),
      createdAt: new Date('2023-06-12'),
      completedAt: new Date('2023-06-14'),
    },
  ];

  // Setup mock week days
  const mockWeekDays = [
    new Date('2023-06-12'), // Monday
    new Date('2023-06-13'), // Tuesday
    new Date('2023-06-14'), // Wednesday
    new Date('2023-06-15'), // Thursday
    new Date('2023-06-16'), // Friday
    new Date('2023-06-17'), // Saturday
    new Date('2023-06-18'), // Sunday
  ];

  beforeEach(() => {
    // Mock the date-fns functions to return our controlled dates
    vi.mocked(dateFns.startOfWeek).mockReturnValue(mockWeekDays[0]);
    vi.mocked(dateFns.endOfWeek).mockReturnValue(mockWeekDays[6]);
  });

  it('renders the component with week days', () => {
    render(<WeeklyTimelineView tasks={mockTasks} />);

    // Check if the title is rendered
    expect(screen.getByText('Weekly Timeline')).toBeInTheDocument();

    // Check if the days of the week are rendered
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  it('renders tasks on the correct days', () => {
    render(<WeeklyTimelineView tasks={mockTasks} />);

    // Check if virtualized timeline is rendered
    expect(screen.getAllByTestId('virtualized-timeline').length).toBeGreaterThan(0);

    // Check if tasks are rendered in the virtualized timeline
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('renders error boundary around the timeline', () => {
    render(<WeeklyTimelineView tasks={mockTasks} />);

    // Check if error boundary is rendered
    expect(screen.getByTestId('timeline-error-boundary')).toBeInTheDocument();
  });
});
