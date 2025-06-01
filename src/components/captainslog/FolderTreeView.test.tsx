import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FolderTreeView } from './FolderTreeView';
import { getCategoriesForCaptainsLog, getGoalsForCategory } from '@/actions/captainslog-categories';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the server actions
vi.mock('@/actions/captainslog-categories', () => ({
  getCategoriesForCaptainsLog: vi.fn(),
  getGoalsForCategory: vi.fn()
}));

describe('FolderTreeView', () => {
  // Mock data
  const mockCategories = [
    { id: 'cat1', name: 'Finance', color: '#10b981', createdAt: new Date() },
    { id: 'cat2', name: 'Health', color: '#ef4444', createdAt: new Date() },
    { id: 'cat3', name: 'Work', color: '#3b82f6', createdAt: new Date() }
  ];

  const mockGoalsFinance = [
    { id: 'goal1', name: 'Save $10,000', description: 'Save for vacation', category: 'cat1', createdAt: new Date() },
    { id: 'goal2', name: 'Invest in stocks', description: 'Build portfolio', category: 'cat1', createdAt: new Date() }
  ];

  const mockGoalsHealth = [
    { id: 'goal3', name: 'Run 5K', description: 'Train for race', category: 'cat2', createdAt: new Date() },
    { id: 'goal4', name: 'Eat healthier', description: 'More vegetables', category: 'cat2', createdAt: new Date() }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    (getCategoriesForCaptainsLog as any).mockResolvedValue({
      success: true,
      data: mockCategories
    });

    (getGoalsForCategory as any).mockImplementation((categoryId) => {
      if (categoryId === 'cat1') {
        return Promise.resolve({
          success: true,
          data: mockGoalsFinance
        });
      } else if (categoryId === 'cat2') {
        return Promise.resolve({
          success: true,
          data: mockGoalsHealth
        });
      } else {
        return Promise.resolve({
          success: true,
          data: []
        });
      }
    });
  });

  it('renders loading state initially', () => {
    render(<FolderTreeView />);
    expect(screen.getByText('Loading folder structure...')).toBeInTheDocument();
  });

  it('renders categories after loading', async () => {
    render(<FolderTreeView />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
    });
  });

  it('expands system folders (Finance, Health) automatically', async () => {
    render(<FolderTreeView />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    // Check if goals for Finance and Health are visible
    await waitFor(() => {
      expect(screen.getByText('Save $10,000')).toBeInTheDocument();
      expect(screen.getByText('Invest in stocks')).toBeInTheDocument();
      expect(screen.getByText('Run 5K')).toBeInTheDocument();
      expect(screen.getByText('Eat healthier')).toBeInTheDocument();
    });
  });

  it('handles node selection', async () => {
    const handleNodeSelect = vi.fn();
    render(<FolderTreeView onSelectNode={handleNodeSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });

    // Click on a category
    fireEvent.click(screen.getByText('Finance'));

    expect(handleNodeSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'cat1',
      name: 'Finance',
      type: 'category'
    }));

    // Click on a goal
    await waitFor(() => {
      expect(screen.getByText('Save $10,000')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save $10,000'));

    expect(handleNodeSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'goal1',
      name: 'Save $10,000',
      type: 'goal'
    }));
  });

  it('handles error state', async () => {
    // Mock an error response
    (getCategoriesForCaptainsLog as any).mockResolvedValue({
      success: false,
      error: 'Failed to fetch categories'
    });

    render(<FolderTreeView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load folder structure. Please try again.')).toBeInTheDocument();
    });
  });
});
