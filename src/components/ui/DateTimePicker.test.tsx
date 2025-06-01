import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePicker } from './DateTimePicker';
import { format } from 'date-fns';

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

describe('DateTimePicker Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default props', () => {
    const today = new Date();
    render(<DateTimePicker value={today} onChange={mockOnChange} />);

    // Check if the button with the date is rendered
    const dateButton = screen.getByText(format(today, 'PPP'));
    expect(dateButton).toBeInTheDocument();
  });

  it('opens the calendar when clicked', async () => {
    const today = new Date();
    render(<DateTimePicker value={today} onChange={mockOnChange} />);

    // Click the date button
    const dateButton = screen.getByText(format(today, 'PPP'));
    fireEvent.click(dateButton);

    // Check if the calendar is displayed
    await waitFor(() => {
      // Look for month name in the calendar
      const currentMonth = format(today, 'MMMM yyyy');
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });
  });

  it('has configurable time step', () => {
    const today = new Date();

    // Render with 15-minute time step
    render(<DateTimePicker
      value={today}
      onChange={mockOnChange}
      timeStep={15}
    />);

    // Verify the component rendered
    expect(screen.getByText(format(today, 'PPP'))).toBeInTheDocument();
  });

  it('has configurable time range', () => {
    const today = new Date();

    // Render with custom time range
    render(<DateTimePicker
      value={today}
      onChange={mockOnChange}
      timeRange={{ startHour: 9, endHour: 17 }} // 9 AM to 5 PM
    />);

    // Verify the component rendered
    expect(screen.getByText(format(today, 'PPP'))).toBeInTheDocument();
  });

  it('handles null value gracefully', () => {
    render(<DateTimePicker
      value={null}
      onChange={mockOnChange}
    />);

    // Should show placeholder text
    expect(screen.getByText(/pick a date/i)).toBeInTheDocument();
  });
});
