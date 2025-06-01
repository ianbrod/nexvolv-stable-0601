import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FPSMonitor,
  FPSMeasurement,
  MemoryMeasurement,
  PerformanceMeasurement,
  measureMemoryUsage,
  startMeasurement,
} from '@/lib/utils/performance-utils';

interface PerformanceMonitoringOptions {
  /** Whether to monitor FPS */
  monitorFPS?: boolean;
  /** Duration of each FPS sample in milliseconds */
  fpsSampleDuration?: number;
  /** Maximum number of FPS samples to keep */
  maxFPSSamples?: number;
  /** Whether to monitor memory usage */
  monitorMemory?: boolean;
  /** Interval for memory measurements in milliseconds */
  memoryMeasurementInterval?: number;
  /** Maximum number of memory measurements to keep */
  maxMemoryMeasurements?: number;
  /** Whether to measure initial render time */
  measureInitialRender?: boolean;
  /** Whether to measure re-renders */
  measureReRenders?: boolean;
}

interface PerformanceMonitoringResult {
  /** FPS measurements */
  fpsMeasurements: FPSMeasurement[];
  /** Memory measurements */
  memoryMeasurements: MemoryMeasurement[];
  /** Initial render time measurement */
  initialRenderTime: PerformanceMeasurement | null;
  /** Re-render time measurements */
  reRenderTimes: PerformanceMeasurement[];
  /** Current FPS */
  currentFPS: number;
  /** Average FPS */
  averageFPS: number;
  /** Current memory usage */
  currentMemoryUsage: MemoryMeasurement | null;
  /** Start monitoring */
  startMonitoring: () => void;
  /** Stop monitoring */
  stopMonitoring: () => void;
  /** Reset all measurements */
  resetMeasurements: () => void;
  /** Measure a re-render */
  measureReRender: (name?: string) => () => void;
  /** Whether monitoring is active */
  isMonitoring: boolean;
}

const DEFAULT_OPTIONS: PerformanceMonitoringOptions = {
  monitorFPS: true,
  fpsSampleDuration: 1000,
  maxFPSSamples: 60,
  monitorMemory: true,
  memoryMeasurementInterval: 1000,
  maxMemoryMeasurements: 60,
  measureInitialRender: true,
  measureReRenders: true,
};

/**
 * Hook for monitoring performance in React components
 */
export function usePerformanceMonitoring(
  options: PerformanceMonitoringOptions = {}
): PerformanceMonitoringResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // State for measurements
  const [fpsMeasurements, setFPSMeasurements] = useState<FPSMeasurement[]>([]);
  const [memoryMeasurements, setMemoryMeasurements] = useState<MemoryMeasurement[]>([]);
  const [initialRenderTime, setInitialRenderTime] = useState<PerformanceMeasurement | null>(null);
  const [reRenderTimes, setReRenderTimes] = useState<PerformanceMeasurement[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Refs for monitoring instances
  const fpsMonitorRef = useRef<FPSMonitor | null>(null);
  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialRenderMeasuredRef = useRef(false);
  
  // Calculate derived values
  const currentFPS = fpsMeasurements.length > 0 ? fpsMeasurements[fpsMeasurements.length - 1].fps : 0;
  const averageFPS = fpsMeasurements.length > 0
    ? Math.round(fpsMeasurements.reduce((sum, m) => sum + m.fps, 0) / fpsMeasurements.length)
    : 0;
  const currentMemoryUsage = memoryMeasurements.length > 0
    ? memoryMeasurements[memoryMeasurements.length - 1]
    : null;
  
  // Measure initial render
  useEffect(() => {
    if (mergedOptions.measureInitialRender && !initialRenderMeasuredRef.current) {
      const endMeasurement = startMeasurement('initialRender');
      
      // Use requestAnimationFrame to measure after the component has rendered
      requestAnimationFrame(() => {
        // Use another rAF to ensure we're measuring after paint
        requestAnimationFrame(() => {
          const measurement = endMeasurement();
          setInitialRenderTime(measurement);
          initialRenderMeasuredRef.current = true;
        });
      });
    }
  }, [mergedOptions.measureInitialRender]);
  
  // Handle FPS updates
  const handleFPSUpdate = useCallback((measurement: FPSMeasurement) => {
    setFPSMeasurements(prev => {
      const newMeasurements = [...prev, measurement];
      if (newMeasurements.length > (mergedOptions.maxFPSSamples || 60)) {
        return newMeasurements.slice(newMeasurements.length - (mergedOptions.maxFPSSamples || 60));
      }
      return newMeasurements;
    });
  }, [mergedOptions.maxFPSSamples]);
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    // Start FPS monitoring
    if (mergedOptions.monitorFPS) {
      fpsMonitorRef.current = new FPSMonitor(
        handleFPSUpdate,
        mergedOptions.fpsSampleDuration
      );
      fpsMonitorRef.current.start();
    }
    
    // Start memory monitoring
    if (mergedOptions.monitorMemory) {
      const measureMemory = () => {
        const measurement = measureMemoryUsage();
        if (measurement) {
          setMemoryMeasurements(prev => {
            const newMeasurements = [...prev, measurement];
            if (newMeasurements.length > (mergedOptions.maxMemoryMeasurements || 60)) {
              return newMeasurements.slice(newMeasurements.length - (mergedOptions.maxMemoryMeasurements || 60));
            }
            return newMeasurements;
          });
        }
      };
      
      // Take initial measurement
      measureMemory();
      
      // Set up interval for regular measurements
      memoryIntervalRef.current = setInterval(
        measureMemory,
        mergedOptions.memoryMeasurementInterval
      );
    }
    
    setIsMonitoring(true);
  }, [
    isMonitoring,
    mergedOptions.monitorFPS,
    mergedOptions.monitorMemory,
    mergedOptions.fpsSampleDuration,
    mergedOptions.memoryMeasurementInterval,
    mergedOptions.maxMemoryMeasurements,
    handleFPSUpdate,
  ]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    // Stop FPS monitoring
    if (fpsMonitorRef.current) {
      fpsMonitorRef.current.stop();
      fpsMonitorRef.current = null;
    }
    
    // Stop memory monitoring
    if (memoryIntervalRef.current) {
      clearInterval(memoryIntervalRef.current);
      memoryIntervalRef.current = null;
    }
    
    setIsMonitoring(false);
  }, [isMonitoring]);
  
  // Reset all measurements
  const resetMeasurements = useCallback(() => {
    setFPSMeasurements([]);
    setMemoryMeasurements([]);
    setInitialRenderTime(null);
    setReRenderTimes([]);
    initialRenderMeasuredRef.current = false;
  }, []);
  
  // Measure a re-render
  const measureReRender = useCallback((name: string = 'reRender') => {
    if (!mergedOptions.measureReRenders) return () => {};
    
    const endMeasurement = startMeasurement(name);
    
    return () => {
      // Use requestAnimationFrame to measure after the component has rendered
      requestAnimationFrame(() => {
        // Use another rAF to ensure we're measuring after paint
        requestAnimationFrame(() => {
          const measurement = endMeasurement();
          setReRenderTimes(prev => [...prev, measurement]);
        });
      });
    };
  }, [mergedOptions.measureReRenders]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (fpsMonitorRef.current) {
        fpsMonitorRef.current.stop();
      }
      
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
      }
    };
  }, []);
  
  return {
    fpsMeasurements,
    memoryMeasurements,
    initialRenderTime,
    reRenderTimes,
    currentFPS,
    averageFPS,
    currentMemoryUsage,
    startMonitoring,
    stopMonitoring,
    resetMeasurements,
    measureReRender,
    isMonitoring,
  };
}
