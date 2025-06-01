import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@/tests/test-utils';
import { ImportHistory } from '../ImportHistory';
import { getImportHistory } from '@/lib/utils/dataExport';

// Mock the dataExport module
vi.mock('@/lib/utils/dataExport', () => ({
  getImportHistory: vi.fn()
}));

// We're using the global localStorage mock from setup.ts

describe('ImportHistory Component', () => {
  const mockHistory = [
    {
      date: '2023-01-02T12:00:00.000Z',
      format: 'json' as const,
      success: true,
      itemCounts: {
        goals: 5,
        tasks: 10,
        categories: 3,
        habits: 2
      }
    },
    {
      date: '2023-01-01T12:00:00.000Z',
      format: 'csv' as const,
      success: false,
      error: 'Invalid data format'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (getImportHistory as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockHistory);
  });

  it('renders the history entries correctly', () => {
    render(<ImportHistory />);

    // Check title
    expect(screen.getByText('Import History')).toBeInTheDocument();

    // Check successful import entry
    expect(screen.getByText('Import Successful')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Goals: 5')).toBeInTheDocument();
    expect(screen.getByText('Tasks: 10')).toBeInTheDocument();
    expect(screen.getByText('Categories: 3')).toBeInTheDocument();
    expect(screen.getByText('Habits: 2')).toBeInTheDocument();

    // Check failed import entry
    expect(screen.getByText('Import Failed')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('Error: Invalid data format')).toBeInTheDocument();
  });

  it('shows empty message when no history is available', () => {
    (getImportHistory as unknown as ReturnType<typeof vi.fn>).mockReturnValue([]);

    render(<ImportHistory />);

    expect(screen.getByText('No import history available')).toBeInTheDocument();

    // Clear History button should not be present
    expect(screen.queryByText('Clear History')).not.toBeInTheDocument();
  });

  it('clears history when clear button is clicked', () => {
    render(<ImportHistory />);

    // Click clear history button
    fireEvent.click(screen.getByRole('button', { name: 'Clear History' }));

    // localStorage.removeItem should be called
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('import-history');
  });

  it('formats dates correctly', () => {
    render(<ImportHistory />);

    // Check for formatted dates (this will depend on the locale of the test environment)
    // For simplicity, we'll just check for parts of the date
    expect(screen.getByText(/Jan 2, 2023/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
  });
});
