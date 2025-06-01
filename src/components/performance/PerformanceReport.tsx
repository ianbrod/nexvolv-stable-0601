'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDuration, formatMemorySize, PerformanceMetrics, PerformanceMeasurement, FPSMeasurement, MemoryMeasurement } from '@/lib/utils/performance-utils';
// Removed recharts dependency for now
import { Download, Save } from 'lucide-react';

interface PerformanceReportProps {
  metrics: PerformanceMetrics[];
  onSave?: (metrics: PerformanceMetrics[]) => void;
  onClear?: () => void;
}

export function PerformanceReport({ metrics, onSave, onClear }: PerformanceReportProps) {
  const [activeTab, setActiveTab] = useState('summary');

  // Calculate summary statistics
  const averageInitialRenderTime = metrics
    .filter(m => m.renderTime)
    .reduce((sum, m) => sum + (m.renderTime?.duration || 0), 0) /
    metrics.filter(m => m.renderTime).length || 0;

  const averageReRenderTime = metrics
    .filter(m => m.reRenderTime)
    .reduce((sum, m) => sum + (m.reRenderTime?.duration || 0), 0) /
    metrics.filter(m => m.reRenderTime).length || 0;

  const averageFPS = metrics
    .flatMap(m => m.scrollingPerformance || [])
    .reduce((sum, m) => sum + m.fps, 0) /
    metrics.flatMap(m => m.scrollingPerformance || []).length || 0;

  const minFPS = Math.min(
    ...metrics.flatMap(m => m.scrollingPerformance || []).map(m => m.fps),
    Infinity
  );

  const maxFPS = Math.max(
    ...metrics.flatMap(m => m.scrollingPerformance || []).map(m => m.fps),
    0
  );

  const peakMemoryUsage = Math.max(
    ...metrics.flatMap(m => m.memoryUsage || []).map(m => m.usedJSHeapSize || 0),
    0
  );

  // Prepare chart data
  const renderTimeChartData = metrics.map((m, i) => ({
    name: m.testName || `Test ${i + 1}`,
    initialRender: m.renderTime?.duration || 0,
    reRender: m.reRenderTime?.duration || 0,
  }));

  const fpsChartData = metrics.map((m, i) => {
    const fps = m.scrollingPerformance || [];
    const avgFPS = fps.reduce((sum, f) => sum + f.fps, 0) / fps.length || 0;
    const minFPS = Math.min(...fps.map(f => f.fps), Infinity);
    const maxFPS = Math.max(...fps.map(f => f.fps), 0);

    return {
      name: m.testName || `Test ${i + 1}`,
      avgFPS,
      minFPS: isFinite(minFPS) ? minFPS : 0,
      maxFPS,
    };
  });

  const memoryChartData = metrics.map((m, i) => {
    const memory = m.memoryUsage || [];
    const avgMemory = memory.reduce((sum, mem) => sum + (mem.usedJSHeapSize || 0), 0) / memory.length || 0;
    const peakMemory = Math.max(...memory.map(mem => mem.usedJSHeapSize || 0), 0);

    return {
      name: m.testName || `Test ${i + 1}`,
      avgMemory: avgMemory / (1024 * 1024), // Convert to MB
      peakMemory: peakMemory / (1024 * 1024), // Convert to MB
    };
  });

  // Export report as JSON
  const exportReport = () => {
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileDefaultName = `performance-report-${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Save report
  const handleSave = () => {
    if (onSave) {
      onSave(metrics);
    }
  };

  // Clear report
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Performance Test Report</CardTitle>
        <CardDescription>
          Analysis of {metrics.length} performance test{metrics.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="renderTime">Render Time</TabsTrigger>
            <TabsTrigger value="fps">FPS</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Initial Render</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDuration(averageInitialRenderTime)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Re-render</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDuration(averageReRenderTime)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. FPS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {averageFPS.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Min: {minFPS.toFixed(1)} | Max: {maxFPS.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Peak Memory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatMemorySize(peakMemoryUsage)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Test Summary</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Initial Render</TableHead>
                    <TableHead>Avg. FPS</TableHead>
                    <TableHead>Peak Memory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric, i) => {
                    const avgFPS = metric.scrollingPerformance?.reduce((sum, f) => sum + f.fps, 0) /
                      (metric.scrollingPerformance?.length || 1) || 0;

                    const peakMemory = Math.max(
                      ...(metric.memoryUsage || []).map(m => m.usedJSHeapSize || 0),
                      0
                    );

                    return (
                      <TableRow key={i}>
                        <TableCell>{metric.testName || `Test ${i + 1}`}</TableCell>
                        <TableCell>{metric.testParameters?.itemCount || 'N/A'}</TableCell>
                        <TableCell>{metric.renderTime ? formatDuration(metric.renderTime.duration) : 'N/A'}</TableCell>
                        <TableCell>{avgFPS.toFixed(1)}</TableCell>
                        <TableCell>{formatMemorySize(peakMemory)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="renderTime">
            <div className="space-y-6">
              <div className="h-80 bg-muted p-4 rounded-md">
                <p className="text-sm">Chart visualization requires recharts package</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Average Initial Render: {renderTimeChartData.reduce((sum, item) => sum + (item.initialRender || 0), 0) / renderTimeChartData.length}ms
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Average Re-render: {renderTimeChartData.reduce((sum, item) => sum + (item.reRender || 0), 0) / renderTimeChartData.length}ms
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Initial Render</TableHead>
                    <TableHead>Re-render</TableHead>
                    <TableHead>Improvement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric, i) => {
                    const initialRender = metric.renderTime?.duration || 0;
                    const reRender = metric.reRenderTime?.duration || 0;
                    const improvement = initialRender > 0 && reRender > 0
                      ? ((initialRender - reRender) / initialRender) * 100
                      : 0;

                    return (
                      <TableRow key={i}>
                        <TableCell>{metric.testName || `Test ${i + 1}`}</TableCell>
                        <TableCell>{formatDuration(initialRender)}</TableCell>
                        <TableCell>{formatDuration(reRender)}</TableCell>
                        <TableCell className={improvement > 0 ? 'text-green-600' : 'text-red-600'}>
                          {improvement.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="fps">
            <div className="space-y-6">
              <div className="h-80 bg-muted p-4 rounded-md">
                <p className="text-sm">Chart visualization requires recharts package</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Average FPS: {fpsChartData.reduce((sum, item) => sum + (item.avgFPS || 0), 0) / fpsChartData.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Min FPS: {Math.min(...fpsChartData.map(item => item.minFPS || Infinity))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max FPS: {Math.max(...fpsChartData.map(item => item.maxFPS || 0))}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Avg. FPS</TableHead>
                    <TableHead>Min FPS</TableHead>
                    <TableHead>Max FPS</TableHead>
                    <TableHead>Stability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric, i) => {
                    const fps = metric.scrollingPerformance || [];
                    const avgFPS = fps.reduce((sum, f) => sum + f.fps, 0) / fps.length || 0;
                    const minFPS = Math.min(...fps.map(f => f.fps), Infinity);
                    const maxFPS = Math.max(...fps.map(f => f.fps), 0);
                    const stability = fps.length > 0
                      ? ((avgFPS - (isFinite(minFPS) ? minFPS : 0)) / avgFPS) * 100
                      : 0;

                    return (
                      <TableRow key={i}>
                        <TableCell>{metric.testName || `Test ${i + 1}`}</TableCell>
                        <TableCell>{avgFPS.toFixed(1)}</TableCell>
                        <TableCell>{isFinite(minFPS) ? minFPS.toFixed(1) : 'N/A'}</TableCell>
                        <TableCell>{maxFPS.toFixed(1)}</TableCell>
                        <TableCell className={stability < 20 ? 'text-green-600' : stability < 40 ? 'text-yellow-600' : 'text-red-600'}>
                          {(100 - stability).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="memory">
            <div className="space-y-6">
              <div className="h-80 bg-muted p-4 rounded-md">
                <p className="text-sm">Chart visualization requires recharts package</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Average Memory: {memoryChartData.reduce((sum, item) => sum + (item.avgMemory || 0), 0) / memoryChartData.length} MB
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Peak Memory: {Math.max(...memoryChartData.map(item => item.peakMemory || 0))} MB
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Avg. Memory</TableHead>
                    <TableHead>Peak Memory</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Memory per Item</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric, i) => {
                    const memory = metric.memoryUsage || [];
                    const avgMemory = memory.reduce((sum, m) => sum + (m.usedJSHeapSize || 0), 0) / memory.length || 0;
                    const peakMemory = Math.max(...memory.map(m => m.usedJSHeapSize || 0), 0);
                    const itemCount = metric.testParameters?.itemCount || 0;
                    const memoryPerItem = itemCount > 0 ? avgMemory / itemCount : 0;

                    return (
                      <TableRow key={i}>
                        <TableCell>{metric.testName || `Test ${i + 1}`}</TableCell>
                        <TableCell>{formatMemorySize(avgMemory)}</TableCell>
                        <TableCell>{formatMemorySize(peakMemory)}</TableCell>
                        <TableCell>{itemCount}</TableCell>
                        <TableCell>{formatMemorySize(memoryPerItem)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="raw">
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md">
                <pre className="text-xs overflow-auto max-h-96">
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between">
        <div>
          <Button variant="outline" onClick={handleClear}>
            Clear Data
          </Button>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Report
          </Button>
          <Button onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
