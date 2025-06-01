import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProgressChart } from '@/components/ui/charts/ProgressChart';
import { addDays, subDays } from 'date-fns';

// Mock the ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ProgressChart Component', () => {
  // Sample data for testing
  const generateSampleData = (count: number = 7) => {
    const now = new Date();
    const result = [];
    
    for (let i = 0; i < count; i++) {
      const date = subDays(now, count - i - 1);
      result.push({
        date: date.getTime(),
        progress: Math.round(Math.random() * 100),
        notes: `Sample data point ${i + 1}`
      });
    }
    
    return result;
  };
  
  it('renders without crashing', () => {
    const sampleData = generateSampleData();
    render(<ProgressChart data={sampleData} />);
    // If it renders without throwing, the test passes
  });
  
  it('shows empty state message when no data is provided', () => {
    render(<ProgressChart data={[]} emptyMessage="No data available" />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
  
  it('validates and handles invalid data gracefully', () => {
    // Create some invalid data
    const invalidData = [
      { date: 'invalid-date', progress: 50 },
      { date: new Date(), progress: -10 },
      { date: new Date(), progress: 150 },
      { notDate: new Date(), progress: 50 },
      { date: new Date() }
    ];
    
    // @ts-ignore - Intentionally passing invalid data for testing
    render(<ProgressChart data={invalidData} />);
    // Should not crash and should render something
  });
  
  it('renders with different time ranges', () => {
    const sampleData = generateSampleData(30);
    
    const { rerender } = render(
      <ProgressChart data={sampleData} timeRange="week" />
    );
    
    // Test different time ranges
    rerender(<ProgressChart data={sampleData} timeRange="month" />);
    rerender(<ProgressChart data={sampleData} timeRange="year" />);
    rerender(<ProgressChart data={sampleData} timeRange="all" />);
    
    // If it renders without throwing, the test passes
  });
  
  it('renders with custom height', () => {
    const sampleData = generateSampleData();
    const { container } = render(
      <ProgressChart data={sampleData} height={400} />
    );
    
    // Check if the container has the correct height
    const chartContainer = container.firstChild as HTMLElement;
    expect(chartContainer.style.height).toBe('400px');
  });
  
  it('renders with custom line color', () => {
    const sampleData = generateSampleData();
    render(
      <ProgressChart data={sampleData} lineColor="#ff0000" />
    );
    // Visual test - would need visual regression testing to fully verify
  });
});
