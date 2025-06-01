'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3, Clock, Memory, Zap } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  scrollFPS: number;
  memoryUsage: number;
  visibleItems: number;
  totalItems: number;
  cacheHitRate: number;
  lastUpdate: number;
}

interface VirtualizationPerformanceMonitorProps {
  /** Component name for identification */
  componentName: string;
  /** Current performance metrics */
  metrics: Partial<PerformanceMetrics>;
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  /** Performance thresholds for alerts */
  thresholds?: {
    renderTime?: number;
    scrollFPS?: number;
    memoryUsage?: number;
  };
  /** Callback when performance issues are detected */
  onPerformanceIssue?: (issue: string, severity: 'low' | 'medium' | 'high') => void;
}

export function VirtualizationPerformanceMonitor({
  componentName,
  metrics,
  showDetails = false,
  thresholds = {
    renderTime: 16, // 60fps target
    scrollFPS: 30,
    memoryUsage: 100 * 1024 * 1024 // 100MB
  },
  onPerformanceIssue
}: VirtualizationPerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<Array<{ message: string; severity: 'low' | 'medium' | 'high'; timestamp: number }>>([]);

  // Update performance history
  useEffect(() => {
    if (metrics.lastUpdate) {
      setPerformanceHistory(prev => {
        const newHistory = [...prev, metrics as PerformanceMetrics].slice(-50); // Keep last 50 measurements
        return newHistory;
      });
    }
  }, [metrics]);

  // Check for performance issues
  useEffect(() => {
    const checkPerformance = () => {
      const issues: Array<{ message: string; severity: 'low' | 'medium' | 'high' }> = [];

      if (metrics.renderTime && metrics.renderTime > (thresholds.renderTime || 16)) {
        const severity = metrics.renderTime > 50 ? 'high' : metrics.renderTime > 25 ? 'medium' : 'low';
        issues.push({
          message: `Slow render time: ${metrics.renderTime.toFixed(1)}ms`,
          severity
        });
      }

      if (metrics.scrollFPS && metrics.scrollFPS < (thresholds.scrollFPS || 30)) {
        const severity = metrics.scrollFPS < 15 ? 'high' : metrics.scrollFPS < 25 ? 'medium' : 'low';
        issues.push({
          message: `Low scroll FPS: ${metrics.scrollFPS.toFixed(1)}`,
          severity
        });
      }

      if (metrics.memoryUsage && metrics.memoryUsage > (thresholds.memoryUsage || 100 * 1024 * 1024)) {
        const severity = metrics.memoryUsage > 200 * 1024 * 1024 ? 'high' : 'medium';
        issues.push({
          message: `High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
          severity
        });
      }

      if (issues.length > 0) {
        const timestamp = Date.now();
        setAlerts(prev => [...prev, ...issues.map(issue => ({ ...issue, timestamp }))].slice(-10));
        
        issues.forEach(issue => {
          onPerformanceIssue?.(issue.message, issue.severity);
        });
      }
    };

    checkPerformance();
  }, [metrics, thresholds, onPerformanceIssue]);

  const getPerformanceScore = useCallback(() => {
    let score = 100;
    
    if (metrics.renderTime) {
      score -= Math.max(0, (metrics.renderTime - 16) * 2);
    }
    
    if (metrics.scrollFPS) {
      score -= Math.max(0, (60 - metrics.scrollFPS) * 1.5);
    }
    
    if (metrics.memoryUsage) {
      const memoryMB = metrics.memoryUsage / 1024 / 1024;
      score -= Math.max(0, (memoryMB - 50) * 0.5);
    }
    
    return Math.max(0, Math.min(100, score));
  }, [metrics]);

  const performanceScore = getPerformanceScore();
  const scoreColor = performanceScore > 80 ? 'text-green-600' : performanceScore > 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {componentName} Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={performanceScore > 80 ? 'default' : performanceScore > 60 ? 'secondary' : 'destructive'}>
              {performanceScore.toFixed(0)}%
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Quick metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3" />
            <span>Render: {metrics.renderTime?.toFixed(1) || 0}ms</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Zap className="h-3 w-3" />
            <span>FPS: {metrics.scrollFPS?.toFixed(0) || 0}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Memory className="h-3 w-3" />
            <span>Memory: {((metrics.memoryUsage || 0) / 1024 / 1024).toFixed(1)}MB</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>Items: {metrics.visibleItems || 0}/{metrics.totalItems || 0}</span>
          </div>
        </div>

        {/* Performance score */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Performance Score</span>
            <span className={scoreColor}>{performanceScore.toFixed(0)}%</span>
          </div>
          <Progress value={performanceScore} className="h-2" />
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium mb-1">Recent Alerts</div>
            <div className="space-y-1">
              {alerts.slice(-3).map((alert, index) => (
                <div key={index} className={`text-xs p-1 rounded ${
                  alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed metrics */}
        {isExpanded && (
          <div className="space-y-2 text-xs">
            <div className="border-t pt-2">
              <div className="font-medium mb-1">Cache Performance</div>
              <div>Hit Rate: {((metrics.cacheHitRate || 0) * 100).toFixed(1)}%</div>
            </div>
            
            {performanceHistory.length > 0 && (
              <div>
                <div className="font-medium mb-1">Recent Trends</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    Avg Render: {(performanceHistory.slice(-10).reduce((sum, m) => sum + (m.renderTime || 0), 0) / 10).toFixed(1)}ms
                  </div>
                  <div>
                    Avg FPS: {(performanceHistory.slice(-10).reduce((sum, m) => sum + (m.scrollFPS || 0), 0) / 10).toFixed(0)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VirtualizationPerformanceMonitor;
