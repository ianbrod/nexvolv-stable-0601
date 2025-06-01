import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YearView } from './YearView';
import { format, addMonths } from 'date-fns';

// Mock ResizeObserver which is not available in the test environment
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Set up the mock before tests run
beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock;
});

describe('YearView', () => {
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
      dueDate: new Date(2023, 6, 17).toISOString(), // July 17, 2023
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Test Task 3',
      description: 'Description 3',
      status: 'In Progress',
      priority: 'High',
      dueDate: new Date(2023, 7, 18).toISOString(), // August 18, 2023
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders the year view with 12 months', () => {
    render(<YearView tasks={mockTasks} currentDate={currentDate} />);

    // Check if the year view is rendered
    expect(screen.getByTestId('year-view')).toBeInTheDocument();

    // Check if all 12 months are rendered
    for (let i = 0; i < 12; i++) {
      const month = addMonths(currentDate, i);
      const monthTitle = format(month, 'MMMM yyyy');
      expect(screen.getByText(monthTitle)).toBeInTheDocument();
    }
  });

  it('displays task counts for each month', () => {
    render(<YearView tasks={mockTasks} currentDate={currentDate} />);

    // Check if task counts are displayed
    // June should have 1 task
    const juneCard = screen.getByText('June 2023').closest('.shadow-sm');
    expect(juneCard).toHaveTextContent('Total Tasks');
    expect(juneCard).toHaveTextContent('1');

    // July should have 1 task
    const julyCard = screen.getByText('July 2023').closest('.shadow-sm');
    expect(julyCard).toHaveTextContent('Total Tasks');
    expect(julyCard).toHaveTextContent('1');

    // August should have 1 task
    const augustCard = screen.getByText('August 2023').closest('.shadow-sm');
    expect(augustCard).toHaveTextContent('Total Tasks');
    expect(augustCard).toHaveTextContent('1');
  });

  it('displays high priority task counts', () => {
    render(<YearView tasks={mockTasks} currentDate={currentDate} />);

    // June should have 1 high priority task
    const juneCard = screen.getByText('June 2023').closest('.shadow-sm');
    expect(juneCard).toHaveTextContent('High Priority');
    expect(juneCard).toHaveTextContent('1');

    // August should have 1 high priority task
    const augustCard = screen.getByText('August 2023').closest('.shadow-sm');
    expect(augustCard).toHaveTextContent('High Priority');
    expect(augustCard).toHaveTextContent('1');

    // July should not have high priority tasks
    const julyCard = screen.getByText('July 2023').closest('.shadow-sm');
    expect(julyCard).not.toHaveTextContent('High Priority');
  });

  it('renders task density visualization for each month', () => {
    render(<YearView tasks={mockTasks} currentDate={currentDate} />);

    // Check if all month cards have a visualization bar
    const monthCards = screen.getAllByText(/^[A-Z][a-z]+ \d{4}$/);
    monthCards.forEach(monthTitle => {
      const card = monthTitle.closest('.shadow-sm');
      expect(card?.querySelector('.h-2.bg-gray-100.rounded-full')).toBeInTheDocument();
    });
  });
});
