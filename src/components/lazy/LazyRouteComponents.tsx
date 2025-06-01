'use client';

import dynamic from 'next/dynamic';
import { Loader2, Mic, Target, BarChart3, Archive, Settings } from 'lucide-react';

// Generic loading component
const RouteLoadingSpinner = ({ icon: Icon, label }: { icon: any, label: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <Icon className="h-12 w-12 text-muted-foreground mb-4" />
    <Loader2 className="h-8 w-8 animate-spin mb-2" />
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

// Lazy load Captain's Log page
export const LazyCaptainsLogPage = dynamic(
  () => import('@/app/captainslog/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <RouteLoadingSpinner icon={Mic} label="Loading Captain's Log..." />,
    ssr: false, // Audio features require client-side APIs
  }
);

// Lazy load Goals page
export const LazyGoalsPage = dynamic(
  () => import('@/app/goals/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <RouteLoadingSpinner icon={Target} label="Loading Goals..." />,
  }
);

// Lazy load Dashboard page
export const LazyDashboardPage = dynamic(
  () => import('@/app/dashboard/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <RouteLoadingSpinner icon={BarChart3} label="Loading Dashboard..." />,
  }
);



// Lazy load Settings page
export const LazySettingsPage = dynamic(
  () => import('@/app/settings/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <RouteLoadingSpinner icon={Settings} label="Loading Settings..." />,
  }
);

// Lazy load Timeline Performance page
export const LazyTimelinePerformancePage = dynamic(
  () => import('@/app/timeline-performance/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <RouteLoadingSpinner icon={BarChart3} label="Loading Performance Monitor..." />,
    ssr: false, // Performance monitoring requires client-side APIs
  }
);

// Lazy load Goal Detail page
export const LazyGoalDetailPage = dynamic(
  () => import('@/app/goals/[goalId]/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <RouteLoadingSpinner icon={Target} label="Loading Goal Details..." />,
  }
);

// Lazy load Captain's Log Archive page
export const LazyCaptainsLogArchivePage = dynamic(
  () => import('@/app/captainslog/archive/page').then(mod => ({ default: mod.default })),
  {
    loading: () => <RouteLoadingSpinner icon={Archive} label="Loading Captain's Log Archive..." />,
  }
);

// Higher-order component for route-based lazy loading
export const withLazyRoute = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  loadingComponent?: React.ComponentType,
  options?: {
    ssr?: boolean;
  }
) => {
  return dynamic(importFn, {
    loading: loadingComponent || (() => <RouteLoadingSpinner icon={Loader2} label="Loading..." />),
    ssr: options?.ssr ?? true,
  });
};

// Export types for better TypeScript support
export type LazyRouteComponentProps = {
  params?: Record<string, string>;
  searchParams?: Record<string, string>;
  onLoad?: () => void;
  onError?: (error: Error) => void;
};
