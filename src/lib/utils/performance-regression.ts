import { PerformanceMetrics } from './performance-utils';

/**
 * Performance budget thresholds
 */
export interface PerformanceBudget {
  /** Maximum acceptable initial render time in milliseconds */
  maxInitialRenderTime?: number;
  /** Maximum acceptable re-render time in milliseconds */
  maxReRenderTime?: number;
  /** Minimum acceptable FPS during scrolling */
  minScrollingFPS?: number;
  /** Maximum acceptable memory usage in bytes */
  maxMemoryUsage?: number;
  /** Maximum acceptable memory usage per item in bytes */
  maxMemoryPerItem?: number;
}

/**
 * Default performance budget
 */
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxInitialRenderTime: 500, // 500ms
  maxReRenderTime: 100, // 100ms
  minScrollingFPS: 30, // 30 FPS
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxMemoryPerItem: 5 * 1024, // 5KB per item
};

/**
 * Result of a performance regression test
 */
export interface RegressionTestResult {
  passed: boolean;
  metrics: PerformanceMetrics;
  budget: PerformanceBudget;
  violations: {
    initialRenderTime?: {
      actual: number;
      threshold: number;
      percentOver: number;
    };
    reRenderTime?: {
      actual: number;
      threshold: number;
      percentOver: number;
    };
    scrollingFPS?: {
      actual: number;
      threshold: number;
      percentUnder: number;
    };
    memoryUsage?: {
      actual: number;
      threshold: number;
      percentOver: number;
    };
    memoryPerItem?: {
      actual: number;
      threshold: number;
      percentOver: number;
    };
  };
}

/**
 * Checks if performance metrics meet the budget
 * @param metrics Performance metrics to check
 * @param budget Performance budget to check against
 * @returns Test result with pass/fail and violation details
 */
export function checkPerformanceBudget(
  metrics: PerformanceMetrics,
  budget: PerformanceBudget = DEFAULT_PERFORMANCE_BUDGET
): RegressionTestResult {
  const violations: RegressionTestResult['violations'] = {};
  let passed = true;
  
  // Check initial render time
  if (budget.maxInitialRenderTime !== undefined && metrics.renderTime) {
    const actual = metrics.renderTime.duration;
    const threshold = budget.maxInitialRenderTime;
    
    if (actual > threshold) {
      passed = false;
      violations.initialRenderTime = {
        actual,
        threshold,
        percentOver: ((actual - threshold) / threshold) * 100,
      };
    }
  }
  
  // Check re-render time
  if (budget.maxReRenderTime !== undefined && metrics.reRenderTime) {
    const actual = metrics.reRenderTime.duration;
    const threshold = budget.maxReRenderTime;
    
    if (actual > threshold) {
      passed = false;
      violations.reRenderTime = {
        actual,
        threshold,
        percentOver: ((actual - threshold) / threshold) * 100,
      };
    }
  }
  
  // Check scrolling FPS
  if (budget.minScrollingFPS !== undefined && metrics.scrollingPerformance && metrics.scrollingPerformance.length > 0) {
    const avgFPS = metrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / metrics.scrollingPerformance.length;
    const threshold = budget.minScrollingFPS;
    
    if (avgFPS < threshold) {
      passed = false;
      violations.scrollingFPS = {
        actual: avgFPS,
        threshold,
        percentUnder: ((threshold - avgFPS) / threshold) * 100,
      };
    }
  }
  
  // Check memory usage
  if (budget.maxMemoryUsage !== undefined && metrics.memoryUsage && metrics.memoryUsage.length > 0) {
    const maxMemory = Math.max(...metrics.memoryUsage.map(m => m.usedJSHeapSize || 0));
    const threshold = budget.maxMemoryUsage;
    
    if (maxMemory > threshold) {
      passed = false;
      violations.memoryUsage = {
        actual: maxMemory,
        threshold,
        percentOver: ((maxMemory - threshold) / threshold) * 100,
      };
    }
  }
  
  // Check memory usage per item
  if (
    budget.maxMemoryPerItem !== undefined &&
    metrics.memoryUsage &&
    metrics.memoryUsage.length > 0 &&
    metrics.testParameters?.itemCount
  ) {
    const maxMemory = Math.max(...metrics.memoryUsage.map(m => m.usedJSHeapSize || 0));
    const itemCount = metrics.testParameters.itemCount;
    const memoryPerItem = maxMemory / itemCount;
    const threshold = budget.maxMemoryPerItem;
    
    if (memoryPerItem > threshold) {
      passed = false;
      violations.memoryPerItem = {
        actual: memoryPerItem,
        threshold,
        percentOver: ((memoryPerItem - threshold) / threshold) * 100,
      };
    }
  }
  
  return {
    passed,
    metrics,
    budget,
    violations,
  };
}

/**
 * Compares two sets of performance metrics to detect regressions
 * @param baseline Baseline metrics
 * @param current Current metrics
 * @param threshold Percentage threshold for regression detection
 * @returns Test result with pass/fail and regression details
 */
export function detectPerformanceRegression(
  baseline: PerformanceMetrics,
  current: PerformanceMetrics,
  threshold: number = 10
): {
  hasRegression: boolean;
  regressions: {
    initialRenderTime?: {
      baseline: number;
      current: number;
      percentChange: number;
    };
    reRenderTime?: {
      baseline: number;
      current: number;
      percentChange: number;
    };
    scrollingFPS?: {
      baseline: number;
      current: number;
      percentChange: number;
    };
    memoryUsage?: {
      baseline: number;
      current: number;
      percentChange: number;
    };
  };
} {
  const regressions: any = {};
  let hasRegression = false;
  
  // Check initial render time
  if (baseline.renderTime && current.renderTime) {
    const baselineTime = baseline.renderTime.duration;
    const currentTime = current.renderTime.duration;
    const percentChange = ((currentTime - baselineTime) / baselineTime) * 100;
    
    if (percentChange > threshold) {
      hasRegression = true;
      regressions.initialRenderTime = {
        baseline: baselineTime,
        current: currentTime,
        percentChange,
      };
    }
  }
  
  // Check re-render time
  if (baseline.reRenderTime && current.reRenderTime) {
    const baselineTime = baseline.reRenderTime.duration;
    const currentTime = current.reRenderTime.duration;
    const percentChange = ((currentTime - baselineTime) / baselineTime) * 100;
    
    if (percentChange > threshold) {
      hasRegression = true;
      regressions.reRenderTime = {
        baseline: baselineTime,
        current: currentTime,
        percentChange,
      };
    }
  }
  
  // Check scrolling FPS
  if (
    baseline.scrollingPerformance &&
    baseline.scrollingPerformance.length > 0 &&
    current.scrollingPerformance &&
    current.scrollingPerformance.length > 0
  ) {
    const baselineFPS =
      baseline.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / baseline.scrollingPerformance.length;
    const currentFPS =
      current.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / current.scrollingPerformance.length;
    const percentChange = ((baselineFPS - currentFPS) / baselineFPS) * 100;
    
    if (percentChange > threshold) {
      hasRegression = true;
      regressions.scrollingFPS = {
        baseline: baselineFPS,
        current: currentFPS,
        percentChange,
      };
    }
  }
  
  // Check memory usage
  if (
    baseline.memoryUsage &&
    baseline.memoryUsage.length > 0 &&
    current.memoryUsage &&
    current.memoryUsage.length > 0
  ) {
    const baselineMemory = Math.max(...baseline.memoryUsage.map(m => m.usedJSHeapSize || 0));
    const currentMemory = Math.max(...current.memoryUsage.map(m => m.usedJSHeapSize || 0));
    const percentChange = ((currentMemory - baselineMemory) / baselineMemory) * 100;
    
    if (percentChange > threshold) {
      hasRegression = true;
      regressions.memoryUsage = {
        baseline: baselineMemory,
        current: currentMemory,
        percentChange,
      };
    }
  }
  
  return {
    hasRegression,
    regressions,
  };
}
