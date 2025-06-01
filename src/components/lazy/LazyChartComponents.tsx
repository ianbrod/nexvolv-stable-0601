'use client';

import dynamic from 'next/dynamic';
import { Loader2, BarChart3 } from 'lucide-react';

// Loading component for chart features
const ChartLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <BarChart3 className="h-8 w-8 text-muted-foreground mr-2" />
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2 text-sm text-muted-foreground">Loading charts...</span>
  </div>
);

// Lazy load progress chart
export const LazyProgressChart = dynamic(
  () => import('@/components/ui/charts/ProgressChart').then(mod => ({ default: mod.ProgressChart })),
  {
    loading: () => <ChartLoadingSpinner />,
    ssr: false, // Charts require client-side rendering
  }
);

// Lazy load performance report with charts
export const LazyPerformanceReport = dynamic(
  () => import('@/components/performance/PerformanceReport').then(mod => ({ default: mod.PerformanceReport })),
  {
    loading: () => <ChartLoadingSpinner />,
    ssr: false,
  }
);

// Lazy load recharts components individually
export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  {
    loading: () => <ChartLoadingSpinner />,
    ssr: false,
  }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  {
    loading: () => <ChartLoadingSpinner />,
    ssr: false,
  }
);

export const LazyAreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  {
    loading: () => <ChartLoadingSpinner />,
    ssr: false,
  }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  {
    loading: () => <ChartLoadingSpinner />,
    ssr: false,
  }
);

// Lazy load chart utilities
export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })),
  {
    loading: () => <div className="w-full h-full" />,
    ssr: false,
  }
);

// Higher-order component for lazy loading chart context
export const withLazyChartContext = <P extends object>(Component: React.ComponentType<P>) => {
  return function WrappedComponent(props: P) {
    const LazyChartWrapper = dynamic(
      () => Promise.resolve({ default: Component }),
      {
        loading: () => <ChartLoadingSpinner />,
        ssr: false,
      }
    );

    return <LazyChartWrapper {...props} />;
  };
};

// Export types for better TypeScript support
export type LazyChartComponentProps = {
  data?: any[];
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
};
