import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImportPreview } from '../ImportPreview';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardFooter: ({ children, className }: any) => <div data-testid="card-footer" className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div data-testid="card-title" className={className}>{children}</div>
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => <div data-testid="tabs" data-value={value} onChange={onValueChange}>{children}</div>,
  TabsContent: ({ children, value, className }: any) => <div data-testid="tabs-content" data-value={value} className={className}>{children}</div>,
  TabsList: ({ children, className }: any) => <div data-testid="tabs-list" className={className}>{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => <button data-testid="tabs-trigger" data-value={value} onClick={onClick}>{children}</button>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button data-testid="button" data-variant={variant} disabled={disabled} onClick={onClick}>{children}</button>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>{children}</span>
  )
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => <div data-testid="scroll-area" className={className}>{children}</div>
}));

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableCell: ({ children }: any) => <td data-testid="table-cell">{children}</td>,
  TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>
}));

vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check">Check</span>,
  X: () => <span data-testid="icon-x">X</span>,
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  FileJson: () => <span data-testid="icon-file-json">FileJson</span>,
  FileSpreadsheet: () => <span data-testid="icon-file-spreadsheet">FileSpreadsheet</span>
}));

describe('ImportPreview Component', () => {
  const mockData = {
    goals: [
      { id: '1', name: 'Goal 1', status: 'active', progress: 50 },
      { id: '2', name: 'Goal 2', status: 'completed', progress: 100 }
    ],
    tasks: [
      { id: '1', name: 'Task 1', status: 'todo', dueDate: '2023-01-01' },
      { id: '2', name: 'Task 2', status: 'done', dueDate: '2023-01-02' }
    ],
    categories: [
      { id: '1', name: 'Category 1' },
      { id: '2', name: 'Category 2' }
    ],
    habits: [],
    exportDate: '2023-01-01T12:00:00.000Z',
    version: '1.0'
  };

  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the preview with correct data', () => {
    render(
      <ImportPreview
        data={mockData}
        format="json"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    // Check title and format badge
    expect(screen.getByText('Import Preview')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();

    // Check data counts
    expect(screen.getByText('Goals: 2')).toBeInTheDocument();
    expect(screen.getByText('Tasks: 2')).toBeInTheDocument();
    expect(screen.getByText('Categories: 2')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Habits')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm Import')).toBeInTheDocument();
  });

  it('shows CSV format badge when format is csv', () => {
    render(
      <ImportPreview
        data={mockData}
        format="csv"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(
      <ImportPreview
        data={mockData}
        format="json"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Confirm Import'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ImportPreview
        data={mockData}
        format="json"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows empty message when no data is available', () => {
    const emptyData = {
      goals: [],
      tasks: [],
      categories: [],
      habits: [],
      exportDate: '2023-01-01T12:00:00.000Z',
      version: '1.0'
    };

    render(
      <ImportPreview
        data={emptyData}
        format="json"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('No Data to Import')).toBeInTheDocument();

    // Confirm button should be disabled
    const confirmButton = screen.getByText('Confirm Import').closest('button');
    expect(confirmButton).toHaveAttribute('disabled');
  });
});
