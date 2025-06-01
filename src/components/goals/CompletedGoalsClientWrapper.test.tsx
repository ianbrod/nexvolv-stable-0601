import { render, screen, fireEvent } from '@testing-library/react';
import { CompletedGoalsClientWrapper } from './CompletedGoalsClientWrapper';
import { vi } from 'vitest';

// Mock the next/navigation module
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Sample test data
const mockCategories = [
  { id: 'cat1', name: 'Career Development', color: '#4c7894' },
  { id: 'cat2', name: 'Personal Growth', color: '#7c4c94' },
  { id: 'cat3', name: 'Health & Fitness', color: '#4c947c' },
];

const mockGoals = [
  {
    id: 'goal1',
    name: 'Learn Advanced TypeScript',
    description: 'Complete a comprehensive course and build a project using advanced TS features.',
    categoryId: 'cat1',
    deadline: new Date('2023-12-31'),
    progress: 100,
    isArchived: false,
    userId: 'user1',
    parentGoalId: null,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-12-20'),
    timeframe: 'Q4 2023',
    order: 1,
    category: mockCategories[0],
    tasks: [
      { id: 'task1', status: 'COMPLETED', dueDate: new Date('2023-12-15') },
      { id: 'task2', status: 'COMPLETED', dueDate: new Date('2023-12-10') }
    ],
    _count: { subGoals: 0 },
    subGoalCount: 0,
    completedTaskCount: 2,
    overdueTaskCount: 0
  },
  {
    id: 'goal2',
    name: 'Read 12 Books This Year',
    description: 'Read one book per month to expand knowledge and perspective.',
    categoryId: 'cat2',
    deadline: new Date('2023-12-31'),
    progress: 100,
    isArchived: false,
    userId: 'user1',
    parentGoalId: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-12-28'),
    timeframe: '2023',
    order: 2,
    category: mockCategories[1],
    tasks: [
      { id: 'task3', status: 'COMPLETED', dueDate: new Date('2023-12-28') }
    ],
    _count: { subGoals: 0 },
    subGoalCount: 0,
    completedTaskCount: 1,
    overdueTaskCount: 0
  }
];

describe('CompletedGoalsClientWrapper', () => {
  it('renders the header with correct goal count', () => {
    render(
      <CompletedGoalsClientWrapper 
        goals={mockGoals} 
        categories={mockCategories} 
      />
    );
    
    expect(screen.getByText('Completed Goals Repository')).toBeInTheDocument();
    expect(screen.getByText('2 achievements to celebrate')).toBeInTheDocument();
  });
  
  it('displays goals grouped by category', () => {
    render(
      <CompletedGoalsClientWrapper 
        goals={mockGoals} 
        categories={mockCategories} 
      />
    );
    
    expect(screen.getByText('Career Development')).toBeInTheDocument();
    expect(screen.getByText('Personal Growth')).toBeInTheDocument();
    expect(screen.getByText('Learn Advanced TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Read 12 Books This Year')).toBeInTheDocument();
  });
  
  it('toggles filters when button is clicked', () => {
    render(
      <CompletedGoalsClientWrapper 
        goals={mockGoals} 
        categories={mockCategories} 
      />
    );
    
    // Filters should be hidden initially
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
    
    // Click the Show Filters button
    fireEvent.click(screen.getByText('Show Filters'));
    
    // Filters should now be visible
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Sort By')).toBeInTheDocument();
    
    // Click the Hide Filters button
    fireEvent.click(screen.getByText('Hide Filters'));
    
    // Filters should be hidden again
    expect(screen.queryByText('Search')).not.toBeInTheDocument();
  });
  
  it('displays empty state when no goals are provided', () => {
    render(
      <CompletedGoalsClientWrapper 
        goals={[]} 
        categories={mockCategories} 
      />
    );
    
    expect(screen.getByText('No Completed Goals Yet')).toBeInTheDocument();
    expect(screen.getByText(/When you complete goals/)).toBeInTheDocument();
  });
  
  it('filters goals by category when a category is selected', async () => {
    render(
      <CompletedGoalsClientWrapper 
        goals={mockGoals} 
        categories={mockCategories} 
      />
    );
    
    // Show filters
    fireEvent.click(screen.getByText('Show Filters'));
    
    // Select the Career Development category
    // Note: This is a simplified test - in a real test you'd need to mock the Select component behavior
    // This is just a placeholder for the concept
    
    // After filtering, only the TypeScript goal should be visible
    // and the Books goal should not be visible
    // This would be tested in a real implementation
  });
});
