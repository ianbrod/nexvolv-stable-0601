'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

// Web Vitals types
interface WebVitalsMetrics {
  CLS: number | null; // Cumulative Layout Shift
  FID: number | null; // First Input Delay
  LCP: number | null; // Largest Contentful Paint
  FCP: number | null; // First Contentful Paint
  TTFB: number | null; // Time to First Byte
}

interface ComponentPerformanceMetric {
  componentName: string;
  renderTime: number;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

interface PerformanceContextType {
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetMeasurements: () => void;
  currentFPS: number;
  averageFPS: number;
  memoryUsage: number | null;
  performanceScore: 'excellent' | 'good' | 'fair' | 'poor';
  alerts: PerformanceAlert[];
  webVitals: WebVitalsMetrics;
  componentMetrics: ComponentPerformanceMetric[];
  memoryLeaks: MemoryLeakDetection[];
  trackComponentRender: (componentName: string, renderTime: number) => void;
}

interface PerformanceAlert {
  id: string;
  type: 'fps' | 'memory' | 'render' | 'webvitals' | 'leak';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MemoryLeakDetection {
  id: string;
  componentName: string;
  suspectedLeak: boolean;
  memoryGrowth: number;
  timestamp: number;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

interface PerformanceMonitorProps {
  children: ReactNode;
  enableAutoMonitoring?: boolean;
  fpsThreshold?: number;
  memoryThreshold?: number;
  webVitalsThresholds?: {
    CLS?: number;
    FID?: number;
    LCP?: number;
    FCP?: number;
    TTFB?: number;
  };
  enableWebVitals?: boolean;
  enableComponentTracking?: boolean;
  enableMemoryLeakDetection?: boolean;
  onAlert?: (alert: PerformanceAlert) => void;
  onWebVitalsUpdate?: (metrics: WebVitalsMetrics) => void;
}

export function PerformanceMonitor({
  children,
  enableAutoMonitoring = true,
  fpsThreshold = 30,
  memoryThreshold = 100 * 1024 * 1024, // 100MB
  webVitalsThresholds = {
    CLS: 0.1,
    FID: 100,
    LCP: 2500,
    FCP: 1800,
    TTFB: 800,
  },
  enableWebVitals = true,
  enableComponentTracking = true,
  enableMemoryLeakDetection = true,
  onAlert,
  onWebVitalsUpdate,
}: PerformanceMonitorProps) {
  const {
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMeasurements,
    currentFPS,
    averageFPS,
    currentMemoryUsage,
  } = usePerformanceMonitoring({
    monitorFPS: true,
    monitorMemory: true,
    fpsSampleDuration: 1000,
    memoryMeasurementInterval: 2000,
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [webVitals, setWebVitals] = useState<WebVitalsMetrics>({
    CLS: null,
    FID: null,
    LCP: null,
    FCP: null,
    TTFB: null,
  });
  const [componentMetrics, setComponentMetrics] = useState<ComponentPerformanceMetric[]>([]);
  const [memoryLeaks, setMemoryLeaks] = useState<MemoryLeakDetection[]>([]);
  const [componentMemoryBaseline, setComponentMemoryBaseline] = useState<Map<string, number>>(new Map());

  // Web Vitals monitoring
  useEffect(() => {
    if (!enableWebVitals || typeof window === 'undefined') return;

    const observeWebVitals = () => {
      // Observe Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            setWebVitals(prev => ({ ...prev, LCP: lastEntry.startTime }));

            if (lastEntry.startTime > webVitalsThresholds.LCP!) {
              addAlert({
                type: 'webvitals',
                severity: 'warning',
                message: `LCP is ${lastEntry.startTime.toFixed(0)}ms (threshold: ${webVitalsThresholds.LCP}ms)`,
                metadata: { metric: 'LCP', value: lastEntry.startTime, threshold: webVitalsThresholds.LCP }
              });
            }
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Observe First Contentful Paint (FCP)
        const fcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint') as any;
          if (fcpEntry) {
            setWebVitals(prev => ({ ...prev, FCP: fcpEntry.startTime }));

            if (fcpEntry.startTime > webVitalsThresholds.FCP!) {
              addAlert({
                type: 'webvitals',
                severity: 'warning',
                message: `FCP is ${fcpEntry.startTime.toFixed(0)}ms (threshold: ${webVitalsThresholds.FCP}ms)`,
                metadata: { metric: 'FCP', value: fcpEntry.startTime, threshold: webVitalsThresholds.FCP }
              });
            }
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Observe Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          setWebVitals(prev => ({ ...prev, CLS: clsValue }));

          if (clsValue > webVitalsThresholds.CLS!) {
            addAlert({
              type: 'webvitals',
              severity: 'warning',
              message: `CLS is ${clsValue.toFixed(3)} (threshold: ${webVitalsThresholds.CLS})`,
              metadata: { metric: 'CLS', value: clsValue, threshold: webVitalsThresholds.CLS }
            });
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        return () => {
          lcpObserver.disconnect();
          fcpObserver.disconnect();
          clsObserver.disconnect();
        };
      }
    };

    const cleanup = observeWebVitals();
    return cleanup;
  }, [enableWebVitals, webVitalsThresholds]);

  // Component performance tracking
  const trackComponentRender = useCallback((componentName: string, renderTime: number) => {
    if (!enableComponentTracking) return;

    setComponentMetrics(prev => {
      const existing = prev.find(m => m.componentName === componentName);
      if (existing) {
        const newRenderCount = existing.renderCount + 1;
        const newAverageRenderTime = ((existing.averageRenderTime * existing.renderCount) + renderTime) / newRenderCount;

        return prev.map(m =>
          m.componentName === componentName
            ? {
                ...m,
                renderTime,
                renderCount: newRenderCount,
                lastRenderTime: Date.now(),
                averageRenderTime: newAverageRenderTime
              }
            : m
        );
      } else {
        return [...prev, {
          componentName,
          renderTime,
          renderCount: 1,
          lastRenderTime: Date.now(),
          averageRenderTime: renderTime
        }];
      }
    });

    // Alert for slow component renders
    if (renderTime > 16) { // 16ms = 60fps threshold
      addAlert({
        type: 'render',
        severity: renderTime > 50 ? 'error' : 'warning',
        message: `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`,
        metadata: { componentName, renderTime }
      });
    }
  }, [enableComponentTracking]);

  // Memory leak detection
  useEffect(() => {
    if (!enableMemoryLeakDetection || !isMonitoring) return;

    const checkMemoryLeaks = () => {
      componentMetrics.forEach(metric => {
        const baseline = componentMemoryBaseline.get(metric.componentName);
        if (baseline && currentMemoryUsage) {
          const memoryGrowth = currentMemoryUsage.usedJSHeapSize - baseline;
          const growthThreshold = 10 * 1024 * 1024; // 10MB growth threshold

          if (memoryGrowth > growthThreshold) {
            const leakId = `leak-${metric.componentName}-${Date.now()}`;
            setMemoryLeaks(prev => [...prev, {
              id: leakId,
              componentName: metric.componentName,
              suspectedLeak: true,
              memoryGrowth,
              timestamp: Date.now()
            }]);

            addAlert({
              type: 'leak',
              severity: 'error',
              message: `Suspected memory leak in ${metric.componentName}: ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB growth`,
              metadata: { componentName: metric.componentName, memoryGrowth }
            });
          }
        } else if (currentMemoryUsage) {
          // Set baseline if not exists
          setComponentMemoryBaseline(prev => new Map(prev.set(metric.componentName, currentMemoryUsage.usedJSHeapSize)));
        }
      });
    };

    const interval = setInterval(checkMemoryLeaks, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [enableMemoryLeakDetection, isMonitoring, componentMetrics, currentMemoryUsage, componentMemoryBaseline]);

  // Helper function to add alerts
  const addAlert = useCallback((alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>) => {
    const alert: PerformanceAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    setAlerts(prev => [...prev, alert].slice(-20)); // Keep last 20 alerts
    onAlert?.(alert);
  }, [onAlert]);

  // Calculate performance score
  const performanceScore = React.useMemo(() => {
    if (averageFPS >= 55) return 'excellent';
    if (averageFPS >= 45) return 'good';
    if (averageFPS >= 30) return 'fair';
    return 'poor';
  }, [averageFPS]);

  // Monitor for performance issues
  useEffect(() => {
    if (!isMonitoring) return;

    const checkPerformance = () => {
      // Check FPS
      if (currentFPS > 0 && currentFPS < fpsThreshold) {
        addAlert({
          type: 'fps',
          severity: currentFPS < 20 ? 'error' : 'warning',
          message: `Low FPS detected: ${currentFPS.toFixed(1)} fps`,
          metadata: { fps: currentFPS, threshold: fpsThreshold }
        });
      }

      // Check memory usage
      if (currentMemoryUsage && currentMemoryUsage.usedJSHeapSize > memoryThreshold) {
        addAlert({
          type: 'memory',
          severity: currentMemoryUsage.usedJSHeapSize > memoryThreshold * 1.5 ? 'error' : 'warning',
          message: `High memory usage: ${(currentMemoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB`,
          metadata: {
            memoryUsage: currentMemoryUsage.usedJSHeapSize,
            threshold: memoryThreshold,
            totalJSHeapSize: currentMemoryUsage.totalJSHeapSize,
            jsHeapSizeLimit: currentMemoryUsage.jsHeapSizeLimit
          }
        });
      }
    };

    const interval = setInterval(checkPerformance, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isMonitoring, currentFPS, currentMemoryUsage, fpsThreshold, memoryThreshold, addAlert]);

  // Auto-start monitoring
  useEffect(() => {
    if (enableAutoMonitoring && !isMonitoring) {
      // Delay start to avoid interfering with initial render
      const timer = setTimeout(startMonitoring, 1000);
      return () => clearTimeout(timer);
    }
  }, [enableAutoMonitoring, isMonitoring, startMonitoring]);

  // Notify about Web Vitals updates
  useEffect(() => {
    onWebVitalsUpdate?.(webVitals);
  }, [webVitals, onWebVitalsUpdate]);

  const contextValue: PerformanceContextType = {
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMeasurements,
    currentFPS,
    averageFPS,
    memoryUsage: currentMemoryUsage?.usedJSHeapSize || null,
    performanceScore,
    alerts,
    webVitals,
    componentMetrics,
    memoryLeaks,
    trackComponentRender,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformanceContext() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceContext must be used within a PerformanceMonitor');
  }
  return context;
}

// Higher-order component for tracking component performance
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const PerformanceTrackedComponent = React.forwardRef<any, P>((props, ref) => {
    const { trackComponentRender } = usePerformanceContext();
    const renderStartTime = React.useRef<number>(0);
    const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

    // Track render start
    renderStartTime.current = performance.now();

    // Track render completion
    React.useLayoutEffect(() => {
      const renderTime = performance.now() - renderStartTime.current;
      trackComponentRender(displayName, renderTime);
    });

    return <WrappedComponent {...props} ref={ref} />;
  });

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;

  return PerformanceTrackedComponent;
}

// Hook for manual performance tracking
export function useComponentPerformanceTracking(componentName: string) {
  const { trackComponentRender } = usePerformanceContext();

  const startTracking = React.useCallback(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      trackComponentRender(componentName, endTime - startTime);
    };
  }, [componentName, trackComponentRender]);

  return { startTracking };
}

// Performance indicator component
export function PerformanceIndicator() {
  const { performanceScore, currentFPS, isMonitoring } = usePerformanceContext();

  if (!isMonitoring) return null;

  const getScoreColor = () => {
    switch (performanceScore) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-2 text-xs shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getScoreColor().replace('text-', 'bg-')}`} />
        <span className={getScoreColor()}>{currentFPS.toFixed(0)} FPS</span>
      </div>
    </div>
  );
}
