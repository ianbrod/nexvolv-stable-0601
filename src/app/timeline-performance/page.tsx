'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChunkedTimelineView } from '@/components/dashboard/ChunkedTimelineView';
import { MonthlyTimelineView } from '@/components/dashboard/MonthlyTimelineView';
import { WeeklyTimelineView } from '@/components/dashboard/WeeklyTimelineView';
import { Task } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { generateTestTasks, TestDataOptions } from '@/lib/utils/test-data-generator';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { formatDuration, formatMemorySize } from '@/lib/utils/performance-utils';
// Removed recharts dependency for now

export default function TimelinePerformancePage() {
  // State for test configuration
  const [taskCount, setTaskCount] = useState<number>(50);
  const [dateDistribution, setDateDistribution] = useState<'even' | 'clustered' | 'random'>('even');
  const [dayRange, setDayRange] = useState<number>(30);
  const [withDescriptionPercentage, setWithDescriptionPercentage] = useState<number>(70);
  const [viewType, setViewType] = useState<'chunked' | 'monthly' | 'weekly'>('chunked');
  const [variableHeight, setVariableHeight] = useState<boolean>(true);
  const [groupByDate, setGroupByDate] = useState<boolean>(true);

  // State for tasks
  const [tasks, setTasks] = useState<Task[]>([]);

  // Performance monitoring
  const {
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
  } = usePerformanceMonitoring();

  // Refs for scrolling test
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Generate tasks based on configuration
  const generateTasks = useCallback(() => {
    const options: TestDataOptions = {
      count: taskCount,
      dateDistribution,
      dayRange,
      withDescriptionPercentage,
    };

    const endReRender = measureReRender('generateTasks');
    const newTasks = generateTestTasks(options);
    setTasks(newTasks);
    endReRender();
  }, [taskCount, dateDistribution, dayRange, withDescriptionPercentage, measureReRender]);

  // Initialize tasks on mount
  useEffect(() => {
    generateTasks();
  }, [generateTasks]);

  // Handle task click
  const handleTaskClick = (task: Task) => {
    console.log('Task clicked:', task);
  };

  // Start scrolling test
  const startScrollingTest = useCallback(() => {
    if (!timelineRef.current || scrollIntervalRef.current) return;

    startMonitoring();

    let direction = 1;
    let position = 0;
    const maxScroll = timelineRef.current.scrollHeight - timelineRef.current.clientHeight;

    scrollIntervalRef.current = setInterval(() => {
      if (!timelineRef.current) return;

      // Change direction when reaching top or bottom
      if (position <= 0) {
        direction = 1;
      } else if (position >= maxScroll) {
        direction = -1;
      }

      // Update position
      position += direction * 10;
      timelineRef.current.scrollTop = position;
    }, 16); // ~60fps
  }, [startMonitoring]);

  // Stop scrolling test
  const stopScrollingTest = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    stopMonitoring();
  }, [stopMonitoring]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Format data for charts
  const fpsChartData = fpsMeasurements.map((m, i) => ({
    index: i,
    fps: m.fps,
    timestamp: m.timestamp.toISOString(),
  }));

  const memoryChartData = memoryMeasurements.map((m, i) => ({
    index: i,
    memory: m.usedJSHeapSize ? m.usedJSHeapSize / (1024 * 1024) : 0, // Convert to MB
    timestamp: m.timestamp.toISOString(),
  }));

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Timeline Performance Testing</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure the test parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskCount">Task Count: {taskCount}</Label>
              <Slider
                id="taskCount"
                min={10}
                max={1000}
                step={10}
                value={[taskCount]}
                onValueChange={(value) => setTaskCount(value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateDistribution">Date Distribution</Label>
              <Select
                value={dateDistribution}
                onValueChange={(value) => setDateDistribution(value as any)}
              >
                <SelectTrigger id="dateDistribution">
                  <SelectValue placeholder="Select distribution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="even">Even</SelectItem>
                  <SelectItem value="clustered">Clustered</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dayRange">Day Range: {dayRange}</Label>
              <Slider
                id="dayRange"
                min={7}
                max={90}
                step={1}
                value={[dayRange]}
                onValueChange={(value) => setDayRange(value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="withDescriptionPercentage">
                With Description: {withDescriptionPercentage}%
              </Label>
              <Slider
                id="withDescriptionPercentage"
                min={0}
                max={100}
                step={5}
                value={[withDescriptionPercentage]}
                onValueChange={(value) => setWithDescriptionPercentage(value[0])}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="viewType">View Type</Label>
              <Select
                value={viewType}
                onValueChange={(value) => setViewType(value as any)}
              >
                <SelectTrigger id="viewType">
                  <SelectValue placeholder="Select view type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chunked">Chunked</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="variableHeight"
                checked={variableHeight}
                onCheckedChange={setVariableHeight}
              />
              <Label htmlFor="variableHeight">Variable Height</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="groupByDate"
                checked={groupByDate}
                onCheckedChange={setGroupByDate}
              />
              <Label htmlFor="groupByDate">Group By Date</Label>
            </div>

            <Button onClick={generateTasks} className="w-full">
              Generate Tasks
            </Button>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Current performance measurements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Initial Render Time:</p>
              <p className="text-2xl font-bold">
                {initialRenderTime ? formatDuration(initialRenderTime.duration) : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Last Re-render Time:</p>
              <p className="text-2xl font-bold">
                {reRenderTimes.length > 0
                  ? formatDuration(reRenderTimes[reRenderTimes.length - 1].duration)
                  : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Current FPS:</p>
              <p className="text-2xl font-bold">
                {isMonitoring ? currentFPS : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Average FPS:</p>
              <p className="text-2xl font-bold">
                {isMonitoring && fpsMeasurements.length > 0 ? averageFPS : 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium">Memory Usage:</p>
              <p className="text-2xl font-bold">
                {currentMemoryUsage
                  ? formatMemorySize(currentMemoryUsage.usedJSHeapSize)
                  : 'N/A'}
              </p>
            </div>

            <div className="pt-4 space-x-2">
              <Button
                onClick={startScrollingTest}
                disabled={isMonitoring}
                variant="default"
              >
                Start Scrolling Test
              </Button>
              <Button
                onClick={stopScrollingTest}
                disabled={!isMonitoring}
                variant="secondary"
              >
                Stop Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Charts */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Charts</CardTitle>
            <CardDescription>Visualize performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-40">
              <p className="text-sm font-medium mb-2">FPS Over Time</p>
              {fpsMeasurements.length > 0 ? (
                <div className="bg-muted p-4 rounded-md h-full overflow-auto">
                  <p className="text-sm">Chart visualization requires recharts package</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Average FPS: {fpsMeasurements.reduce((sum, m) => sum + m.fps, 0) / fpsMeasurements.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Min FPS: {Math.min(...fpsMeasurements.map(m => m.fps))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max FPS: {Math.max(...fpsMeasurements.map(m => m.fps))}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>

            <div className="h-40">
              <p className="text-sm font-medium mb-2">Memory Usage (MB)</p>
              {memoryMeasurements.length > 0 ? (
                <div className="bg-muted p-4 rounded-md h-full overflow-auto">
                  <p className="text-sm">Chart visualization requires recharts package</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Current Memory: {formatMemorySize(currentMemoryUsage?.usedJSHeapSize || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average Memory: {formatMemorySize(memoryMeasurements.reduce((sum, m) => sum + (m.usedJSHeapSize || 0), 0) / memoryMeasurements.length)}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline View */}
      <div ref={timelineRef} className="overflow-auto" style={{ height: '600px' }}>
        <Tabs value={viewType} onValueChange={(value) => setViewType(value as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="chunked">Chunked Timeline</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Timeline</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="chunked" className="space-y-6">
            <ChunkedTimelineView
              tasks={tasks}
              height={550}
              onTaskClick={handleTaskClick}
              title={`Chunked Timeline (${tasks.length} items)`}
            />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyTimelineView
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyTimelineView
              tasks={tasks}
              onTaskClick={handleTaskClick}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
