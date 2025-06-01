import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardGoalCard } from './DashboardGoalCard';
import { Goal, Task } from '@/types';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode, href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('DashboardGoalCard', () => {
  // Setup mock data
  const mockGoal: Goal = {
    id: '1',
    title: 'Test Goal',
    status: 'Active',
    createdAt: new Date('2023-06-10'),
  };

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
      goalId: '1',
      dueDate: new Date('2023-06-01'), // Overdue task
      createdAt: new Date('2023-06-12'),
    },
  ];

  it('renders the goal title', () => {
    render(<DashboardGoalCard goal={mockGoal} linkedTasks={mockTasks} />);
    expect(screen.getByText('Test Goal')).toBeInTheDocument();
  });

  it('displays the correct progress percentage', () => {
    render(<DashboardGoalCard goal={mockGoal} linkedTasks={mockTasks} />);
    // 1 out of 3 tasks completed = 33%
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('shows the task count badge', () => {
    render(<DashboardGoalCard goal={mockGoal} linkedTasks={mockTasks} />);
    expect(screen.getByText('Tasks: 1/3')).toBeInTheDocument();
  });

  it('shows the overdue badge when there are overdue tasks', () => {
    render(<DashboardGoalCard goal={mockGoal} linkedTasks={mockTasks} />);
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
  });

  it('does not show the overdue badge when there are no overdue tasks', () => {
    const tasksWithoutOverdue = mockTasks.map(task => ({
      ...task,
      dueDate: new Date(Date.now() + 86400000), // Set due date to tomorrow
    }));
    
    render(<DashboardGoalCard goal={mockGoal} linkedTasks={tasksWithoutOverdue} />);
    expect(screen.queryByText('Overdue Tasks')).not.toBeInTheDocument();
  });
});
