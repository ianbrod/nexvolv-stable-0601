import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/tests/test-utils';
import { DataManagement } from '../DataManagement';
import { exportAllData, importData, deleteAllData } from '@/lib/utils/dataExport';

// Mock the dataExport module
vi.mock('@/lib/utils/dataExport', () => ({
  exportAllData: vi.fn(),
  importData: vi.fn(),
  deleteAllData: vi.fn(),
  getImportHistory: vi.fn().mockReturnValue([])
}));



// Mock the FileReader API
class MockFileReader {
  onload: any;
  onerror: any;
  readAsText(file: Blob) {
    if (file.size > 0) {
      this.onload({ target: { result: '{"goals":[],"tasks":[],"categories":[]}' } });
    } else {
      this.onerror();
    }
  }
}
global.FileReader = MockFileReader as any;

// We're using the global URL mocks from setup.ts

describe('DataManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful export
    (exportAllData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: '{"goals":[],"tasks":[],"categories":[]}',
      filename: 'export.json'
    });

    // Mock successful import
    (importData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Data imported successfully',
      format: 'json',
      data: { goals: [], tasks: [], categories: [] },
      itemCounts: {
        goals: 0,
        tasks: 0,
        categories: 0,
        habits: 0
      }
    });

    // Mock successful delete
    (deleteAllData as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'All data deleted successfully'
    });
  });

  it('renders export, import, and delete sections', () => {
    render(<DataManagement />);

    // Check section titles
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('Import Data')).toBeInTheDocument();
    expect(screen.getByText('Delete All Data')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByRole('button', { name: 'Export All Data' })).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
    expect(screen.getByText('Import CSV')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete All Data' })).toBeInTheDocument();
  });

  it('handles export button click', async () => {
    render(<DataManagement />);

    // We're using the global document mocks from setup.ts

    // Click export button
    fireEvent.click(screen.getByRole('button', { name: 'Export All Data' }));

    await waitFor(() => {
      expect(exportAllData).toHaveBeenCalled();
      expect(document.createElement('a').click).toHaveBeenCalled();
    });
  });

  it('handles JSON import button click and shows preview', async () => {
    render(<DataManagement />);

    // Create a mock file
    const file = new File(['{"goals":[],"tasks":[],"categories":[]}'], 'data.json', { type: 'application/json' });

    // Get the file input for JSON import
    const fileInput = screen.getByLabelText('Import JSON').querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    // Simulate file selection
    fireEvent.change(fileInput!, { target: { files: [file] } });

    await waitFor(() => {
      expect(importData).toHaveBeenCalled();
      // Preview should be shown
      expect(screen.getByText('Confirm Import')).toBeInTheDocument();
    });
  });

  it('handles CSV import button click', async () => {
    render(<DataManagement />);

    // Create a mock file
    const file = new File(['name,status\nTask 1,todo'], 'data.csv', { type: 'text/csv' });

    // Get the file input for CSV import
    const fileInput = screen.getByLabelText('Import CSV').querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();

    // Simulate file selection
    fireEvent.change(fileInput!, { target: { files: [file] } });

    await waitFor(() => {
      expect(importData).toHaveBeenCalled();
    });
  });

  it('shows import history when button is clicked', () => {
    render(<DataManagement />);

    // Click show history button
    fireEvent.click(screen.getByRole('button', { name: 'Show History' }));

    // Import history should be shown
    expect(screen.getByText('Import History')).toBeInTheDocument();
  });

  it('handles delete button click', async () => {
    render(<DataManagement />);

    // Click delete button
    fireEvent.click(screen.getByRole('button', { name: 'Delete All Data' }));

    // Confirmation dialog should appear
    expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();

    // Click confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete all data' }));

    await waitFor(() => {
      expect(deleteAllData).toHaveBeenCalled();
    });
  });
});
