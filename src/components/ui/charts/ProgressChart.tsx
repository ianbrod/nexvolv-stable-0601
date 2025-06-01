'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { TimeRange, formatChartDate, formatChartTooltipDate } from '@/lib/utils/date-formatting';
import { generateAdaptiveTicks } from '@/lib/utils/chart-ticks';
import { 
  ProgressDataPoint, 
  ensureValidChartData, 
  calculateYAxisDomain 
} from '@/lib/utils/chart-validation';

// Props for the ProgressChart component
export interface ProgressChartProps {
  data: ProgressDataPoint[];
  timeRange?: TimeRange;
  height?: number;
  className?: string;
  showTooltip?: boolean;
  showGrid?: boolean;
  lineColor?: string;
  emptyMessage?: string;
  locale?: string;
  yAxisDomain?: [number, number];
  animationDuration?: number;
}

/**
 * Custom tooltip component for the chart
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border p-3 rounded-md shadow-md">
        <p className="font-medium">{data.formattedDate || formatChartTooltipDate(data.date)}</p>
        <p>Progress: {data.progress}%</p>
        {data.notes && <p className="text-sm text-muted-foreground">Note: {data.notes}</p>}
      </div>
    );
  }
  return null;
};

/**
 * Empty state component for when no data is available
 */
const EmptyState = ({ message = 'No data available' }: { message?: string }) => (
  <div className="flex items-center justify-center h-full">
    <p className="text-muted-foreground text-sm">{message}</p>
  </div>
);

/**
 * A reusable progress chart component
 */
export function ProgressChart({
  data,
  timeRange = 'month',
  height = 300,
  className,
  showTooltip = true,
  showGrid = true,
  lineColor = 'var(--primary)',
  emptyMessage = 'No progress data available',
  locale = 'en-US',
  yAxisDomain,
  animationDuration = 1000,
}: ProgressChartProps) {
  // Reference to the chart container for measuring width
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // State to track chart width for responsive tick generation
  const [chartWidth, setChartWidth] = useState<number>(600);
  
  // Set up resize observer to track chart width
  useEffect(() => {
    if (chartContainerRef.current && typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(entries => {
        setChartWidth(entries[0].contentRect.width);
      });
      
      resizeObserver.observe(chartContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);
  
  // Process and validate data
  const formattedData = useMemo(() => {
    // Ensure data is valid and has enough points
    const validData = ensureValidChartData(data);
    
    // Add formatted date for tooltip display
    return validData.map(point => ({
      ...point,
      formattedDate: formatChartTooltipDate(point.date)
    }));
  }, [data]);
  
  // Generate appropriate ticks based on time range and chart width
  const chartTicks = useMemo(() => {
    return generateAdaptiveTicks(formattedData, timeRange, chartWidth);
  }, [formattedData, timeRange, chartWidth]);
  
  // Calculate Y-axis domain if not provided
  const calculatedYAxisDomain = useMemo(() => {
    return yAxisDomain || calculateYAxisDomain(formattedData);
  }, [formattedData, yAxisDomain]);
  
  // Format X-axis tick labels based on time range
  const formatXAxis = (timestamp: number) => {
    return formatChartDate(timestamp, timeRange, { locale: locale as any });
  };
  
  // If no data is available, show empty state
  if (formattedData.length === 0) {
    return (
      <div 
        className={cn("h-[300px] w-full flex items-center justify-center", className)}
        style={{ height: height }}
      >
        <EmptyState message={emptyMessage} />
      </div>
    );
  }
  
  return (
    <div 
      ref={chartContainerRef} 
      className={cn("w-full", className)}
      style={{ height: height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--border)" 
              vertical={false}
            />
          )}
          
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            ticks={chartTicks}
            domain={['dataMin', 'dataMax']}
            type="number"
            padding={{ left: 10, right: 10 }}
            tickMargin={8}
            angle={timeRange === 'all' ? -30 : 0}
            height={40}
          />
          
          <YAxis
            domain={calculatedYAxisDomain}
            tickCount={6}
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${Math.round(value)}%`}
            padding={{ top: 10, bottom: 10 }}
            width={40}
          />
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
          <Line
            type="monotone"
            dataKey="progress"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 2, fill: 'var(--background)' }}
            activeDot={{ r: 5, strokeWidth: 2 }}
            isAnimationActive={animationDuration > 0}
            animationDuration={animationDuration}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
