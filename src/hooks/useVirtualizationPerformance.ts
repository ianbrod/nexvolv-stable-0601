'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  scrollFPS: number;
  memoryUsage: number;
  visibleItems: number;
  totalItems: number;
  cacheHitRate: number;
  lastUpdate: number;
}

interface UseVirtualizationPerformanceOptions {
  /** Component name for identification */
  componentName: string;
  /** Whether to enable performance monitoring */
  enabled?: boolean;
  /** Sampling interval in milliseconds */
  samplingInterval?: number;
  /** Maximum number of FPS samples to keep */
  maxFPSSamples?: number;
}

export function useVirtualizationPerformance({
  componentName,
  enabled = true,
  samplingInterval = 1000,
  maxFPSSamples = 60
}: UseVirtualizationPerformanceOptions) {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Performance tracking refs
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const renderStartTimeRef = useRef(0);
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Start render timing
  const startRenderTiming = useCallback(() => {
    if (!enabled) return;
    renderStartTimeRef.current = performance.now();
  }, [enabled]);

  // End render timing
  const endRenderTiming = useCallback(() => {
    if (!enabled || renderStartTimeRef.current === 0) return;
    
    const renderTime = performance.now() - renderStartTimeRef.current;
    setMetrics(prev => ({
      ...prev,
      renderTime,
      lastUpdate: Date.now()
    }));
    renderStartTimeRef.current = 0;
  }, [enabled]);

  // Track scroll performance
  const trackScrollFrame = useCallback(() => {
    if (!enabled) return;
    
    const now = performance.now();
    frameCountRef.current++;
    
    if (lastFrameTimeRef.current > 0) {
      const deltaTime = now - lastFrameTimeRef.current;
      const fps = 1000 / deltaTime;
      
      fpsHistoryRef.current.push(fps);
      if (fpsHistoryRef.current.length > maxFPSSamples) {
        fpsHistoryRef.current.shift();
      }
    }
    
    lastFrameTimeRef.current = now;
  }, [enabled, maxFPSSamples]);

  // Update visible items count
  const updateVisibleItems = useCallback((visible: number, total: number) => {
    if (!enabled) return;
    
    setMetrics(prev => ({
      ...prev,
      visibleItems: visible,
      totalItems: total,
      lastUpdate: Date.now()
    }));
  }, [enabled]);

  // Track cache performance
  const trackCacheHit = useCallback(() => {
    if (!enabled) return;
    cacheHitsRef.current++;
  }, [enabled]);

  const trackCacheMiss = useCallback(() => {
    if (!enabled) return;
    cacheMissesRef.current++;
  }, [enabled]);

  // Calculate memory usage (approximation)
  const updateMemoryUsage = useCallback(() => {
    if (!enabled || !(performance as any).memory) return;
    
    const memory = (performance as any).memory;
    setMetrics(prev => ({
      ...prev,
      memoryUsage: memory.usedJSHeapSize,
      lastUpdate: Date.now()
    }));
  }, [enabled]);

  // FPS monitoring loop
  const monitorFPS = useCallback(() => {
    if (!enabled) return;
    
    const animate = () => {
      trackScrollFrame();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [enabled, trackScrollFrame]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!enabled || isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Start FPS monitoring
    monitorFPS();
    
    // Start periodic updates
    intervalRef.current = setInterval(() => {
      // Calculate average FPS
      if (fpsHistoryRef.current.length > 0) {
        const avgFPS = fpsHistoryRef.current.reduce((sum, fps) => sum + fps, 0) / fpsHistoryRef.current.length;
        
        // Calculate cache hit rate
        const totalCacheRequests = cacheHitsRef.current + cacheMissesRef.current;
        const cacheHitRate = totalCacheRequests > 0 ? cacheHitsRef.current / totalCacheRequests : 0;
        
        setMetrics(prev => ({
          ...prev,
          scrollFPS: avgFPS,
          cacheHitRate,
          lastUpdate: Date.now()
        }));
      }
      
      // Update memory usage
      updateMemoryUsage();
      
      // Reset FPS history periodically to avoid memory buildup
      if (fpsHistoryRef.current.length > maxFPSSamples * 2) {
        fpsHistoryRef.current = fpsHistoryRef.current.slice(-maxFPSSamples);
      }
    }, samplingInterval);
  }, [enabled, isMonitoring, monitorFPS, updateMemoryUsage, samplingInterval, maxFPSSamples]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({});
    frameCountRef.current = 0;
    lastFrameTimeRef.current = 0;
    fpsHistoryRef.current = [];
    cacheHitsRef.current = 0;
    cacheMissesRef.current = 0;
  }, []);

  // Auto-start monitoring when enabled
  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    
    return () => {
      stopMonitoring();
    };
  }, [enabled, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    startRenderTiming,
    endRenderTiming,
    trackScrollFrame,
    updateVisibleItems,
    trackCacheHit,
    trackCacheMiss,
    updateMemoryUsage
  };
}

export default useVirtualizationPerformance;
