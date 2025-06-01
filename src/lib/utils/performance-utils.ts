/**
 * Utilities for measuring and monitoring performance
 */

/**
 * Performance measurement result
 */
export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  timestamp: Date;
}

/**
 * FPS measurement result
 */
export interface FPSMeasurement {
  fps: number;
  timestamp: Date;
  sampleDuration: number;
  frameCount: number;
}

/**
 * Memory usage measurement
 */
export interface MemoryMeasurement {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  timestamp: Date;
}

/**
 * Performance metrics for a test run
 */
export interface PerformanceMetrics {
  testName: string;
  testDescription?: string;
  testParameters?: Record<string, any>;
  renderTime?: PerformanceMeasurement;
  reRenderTime?: PerformanceMeasurement;
  scrollingPerformance?: FPSMeasurement[];
  memoryUsage?: MemoryMeasurement[];
  componentRenderCounts?: Record<string, number>;
  timestamp: Date;
}

/**
 * Starts a performance measurement
 * @param name Name of the measurement
 * @returns A function to end the measurement and get the result
 */
export function startMeasurement(name: string): () => PerformanceMeasurement {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      name,
      startTime,
      endTime,
      duration,
      timestamp: new Date(),
    };
  };
}

/**
 * Measures the time it takes to execute a function
 * @param name Name of the measurement
 * @param fn Function to measure
 * @returns The measurement result and the function result
 */
export async function measureExecutionTime<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<[PerformanceMeasurement, T]> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  
  return [
    {
      name,
      startTime,
      endTime,
      duration: endTime - startTime,
      timestamp: new Date(),
    },
    result,
  ];
}

/**
 * Class for measuring FPS (frames per second)
 */
export class FPSMonitor {
  private frameCount: number = 0;
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private onFPSUpdate: (measurement: FPSMeasurement) => void;
  private sampleDuration: number;
  
  /**
   * Creates a new FPS monitor
   * @param onFPSUpdate Callback function for FPS updates
   * @param sampleDuration Duration of each sample in milliseconds
   */
  constructor(
    onFPSUpdate: (measurement: FPSMeasurement) => void,
    sampleDuration: number = 1000
  ) {
    this.onFPSUpdate = onFPSUpdate;
    this.sampleDuration = sampleDuration;
  }
  
  /**
   * Starts monitoring FPS
   */
  start(): void {
    this.frameCount = 0;
    this.startTime = performance.now();
    
    const countFrame = () => {
      this.frameCount++;
      
      const currentTime = performance.now();
      const elapsed = currentTime - this.startTime;
      
      if (elapsed >= this.sampleDuration) {
        const fps = Math.round((this.frameCount * 1000) / elapsed);
        
        this.onFPSUpdate({
          fps,
          timestamp: new Date(),
          sampleDuration: elapsed,
          frameCount: this.frameCount,
        });
        
        this.frameCount = 0;
        this.startTime = currentTime;
      }
      
      this.animationFrameId = requestAnimationFrame(countFrame);
    };
    
    this.animationFrameId = requestAnimationFrame(countFrame);
  }
  
  /**
   * Stops monitoring FPS
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

/**
 * Measures memory usage
 * @returns Memory measurement or null if not supported
 */
export function measureMemoryUsage(): MemoryMeasurement | null {
  if (performance && 'memory' in performance) {
    const memory = (performance as any).memory;
    
    return {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      timestamp: new Date(),
    };
  }
  
  return null;
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted string
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Formats a memory size in bytes to a human-readable string
 * @param bytes Size in bytes
 * @returns Formatted string
 */
export function formatMemorySize(bytes: number | undefined): string {
  if (bytes === undefined) return 'N/A';
  
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)}KB`;
  }
  
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
  
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}
