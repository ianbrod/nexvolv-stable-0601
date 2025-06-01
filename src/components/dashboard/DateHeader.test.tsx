import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateHeader } from './DateHeader';

describe('DateHeader', () => {
  it('renders the date text correctly', () => {
    render(<DateHeader date="Monday, January 1, 2024" />);
    expect(screen.getByText('Monday, January 1, 2024')).toBeInTheDocument();
  });

  it('renders the count badge when provided', () => {
    render(<DateHeader date="Monday, January 1, 2024" count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<DateHeader date="Monday, January 1, 2024" onClick={handleClick} />);

    fireEvent.click(screen.getByTestId('date-header'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies active styling when isActive is true', () => {
    render(<DateHeader date="Monday, January 1, 2024" isActive={true} />);
    const header = screen.getByTestId('date-header');
    expect(header.className).toContain('bg-primary/5');
  });

  it('applies sticky styling by default', () => {
    render(<DateHeader date="Monday, January 1, 2024" />);
    const header = screen.getByTestId('date-header');
    expect(header.className).toContain('sticky top-0');
  });

  it('does not apply sticky styling when isSticky is false', () => {
    render(<DateHeader date="Monday, January 1, 2024" isSticky={false} />);
    const header = screen.getByTestId('date-header');
    expect(header.className).not.toContain('sticky top-0');
  });

  it('applies custom styles when provided', () => {
    const customStyle = { backgroundColor: 'red' };
    render(<DateHeader date="Monday, January 1, 2024" style={customStyle} />);
    const header = screen.getByTestId('date-header');
    expect(header).toHaveStyle('background-color: red');
  });

  it('applies custom className when provided', () => {
    render(<DateHeader date="Monday, January 1, 2024" className="custom-class" />);
    const header = screen.getByTestId('date-header');
    expect(header.className).toContain('custom-class');
  });

  it('renders the type indicator with correct capitalization', () => {
    render(<DateHeader date="Monday, January 1, 2024" type="week" />);
    expect(screen.getByText('Week')).toBeInTheDocument();
  });

  it('renders the boundary indicator when showBoundaryIndicator is true', () => {
    render(<DateHeader date="Monday, January 1, 2024" showBoundaryIndicator={true} />);
    // Check for the boundary indicator element
    const header = screen.getByTestId('date-header');
    const boundaryIndicator = header.querySelector('.absolute.left-0.top-0.bottom-0.w-1');
    expect(boundaryIndicator).toBeInTheDocument();
  });

  it('does not render the boundary indicator when showBoundaryIndicator is false', () => {
    render(<DateHeader date="Monday, January 1, 2024" showBoundaryIndicator={false} />);
    // Check that the boundary indicator element is not present
    const header = screen.getByTestId('date-header');
    const boundaryIndicator = header.querySelector('.absolute.left-0.top-0.bottom-0.w-1');
    expect(boundaryIndicator).not.toBeInTheDocument();
  });

  it('applies different colors based on the chunk type', () => {
    // Test day type
    const { rerender } = render(<DateHeader date="Monday, January 1, 2024" type="day" />);
    expect(screen.getByText('Day')).toHaveClass('bg-blue-500');

    // Test week type
    rerender(<DateHeader date="Monday, January 1, 2024" type="week" />);
    expect(screen.getByText('Week')).toHaveClass('bg-green-500');

    // Test month type
    rerender(<DateHeader date="Monday, January 1, 2024" type="month" />);
    expect(screen.getByText('Month')).toHaveClass('bg-purple-500');

    // Test year type
    rerender(<DateHeader date="Monday, January 1, 2024" type="year" />);
    expect(screen.getByText('Year')).toHaveClass('bg-red-500');
  });
});
