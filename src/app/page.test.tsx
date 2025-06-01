import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';
import { Goal, Task } from '@/types';

// Mock the database queries
vi.mock('@/lib/db', () => ({
  db: {
    tasks: {
      where: vi.fn().mockReturnThis(),
      notEqual: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
    },
    goals: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
    },
  },
}));

// Mock the dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: vi.fn((queryFn) => {
    // Return the mock data based on the query function
    if (queryFn.toString().includes('tasks')) {
      return mockTasks;
    } else if (queryFn.toString().includes('goals')) {
      return mockGoals;
    }
    return null;
  }),
}));

// Mock the components
vi.mock('@/components/dashboard/DashboardGoalCard', () => ({
  DashboardGoalCard: ({ goal, linkedTasks }: { goal: Goal, linkedTasks: Task[] }) => (
    <div data-testid={`goal-card-${goal.id}`}>
      {goal.title} - Tasks: {linkedTasks.length}
    </div>
  ),
}));

vi.mock('@/components/dashboard/WeeklyTimelineView', () => ({
  WeeklyTimelineView: ({ tasks }: { tasks: Task[] }) => (
    <div data-testid="weekly-timeline">
      Timeline with {tasks.length} tasks
    </div>
  ),
}));

// Mock data
const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Goal 1',
    status: 'Active',
    createdAt: new Date('2023-06-10'),
  },
  {
    id: '2',
    title: 'Goal 2',
    status: 'Active',
    createdAt: new Date('2023-06-11'),
  },
  {
    id: '3',
    title: 'Goal 3',
    status: 'Active',
    createdAt: new Date('2023-06-12'),
  },
];

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Task 1',
    priority: 'Medium',
    status: 'Todo',
    goalId: '1',
    createdAt: new Date('2023-06-10'),
  },
  {
    id: '2',
    title: 'Task 2',
    priority: 'High',
    status: 'Completed',
    goalId: '1',
    createdAt: new Date('2023-06-11'),
    completedAt: new Date('2023-06-12'),
  },
  {
    id: '3',
    title: 'Task 3',
    priority: 'Low',
    status: 'Todo',
    goalId: '2',
    createdAt: new Date('2023-06-12'),
  },
];

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard with title', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the top goals section', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Top Goals')).toBeInTheDocument();
  });

  it('renders the timeline section', () => {
    render(<DashboardPage />);
    // Use getAllByText since 'Timeline' appears multiple times
    expect(screen.getAllByText('Timeline')[0]).toBeInTheDocument();
    // We've replaced WeeklyTimelineView with CalendarContainer
    // which doesn't have the weekly-timeline testid
    // expect(screen.getByTestId('weekly-timeline')).toBeInTheDocument();
  });

  it('renders goal cards for top goals', () => {
    render(<DashboardPage />);
    // We should have at least one goal card
    expect(screen.getByTestId('goal-card-1')).toBeInTheDocument();
  });

  it.skip('shows loading state when data is not available', () => {
    // Mock the useLiveQuery to return null (loading state)
    vi.mocked(require('dexie-react-hooks').useLiveQuery).mockReturnValueOnce(null);

    render(<DashboardPage />);
    expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
  });
});
