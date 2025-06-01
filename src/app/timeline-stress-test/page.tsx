'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChunkedTimelineView } from '@/components/dashboard/ChunkedTimelineView';
import { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { generateTestTasks } from '@/lib/utils/test-data-generator';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { formatDuration, formatMemorySize, PerformanceMetrics } from '@/lib/utils/performance-utils';
import { PerformanceReport } from '@/components/performance/PerformanceReport';
import { Loader2 } from 'lucide-react';

export default function TimelineStressTestPage() {
  // State for test configuration
  const [itemCount, setItemCount] = useState<number>(100);
  const [chunkBy, setChunkBy] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dayRange, setDayRange] = useState<number>(90);
  
  // State for tasks and test results
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<PerformanceMetrics[]>([]);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  
  // Performance monitoring
  const {
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
    fpsMeasurements,
    memoryMeasurements,
  } = usePerformanceMonitoring();
  
  // Generate tasks with specified count
  const generateTasks = useCallback(async (count: number) => {
    setIsGenerating(true);
    
    try {
      // Use setTimeout to allow UI to update before heavy computation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const options = {
        count,
        dayRange,
        dateDistribution: 'even' as const,
      };
      
      const newTasks = generateTestTasks(options);
      setTasks(newTasks);
      
      return newTasks;
    } finally {
      setIsGenerating(false);
    }
  }, [dayRange]);
  
  // Run a single test with the specified configuration
  const runTest = useCallback(async (testConfig: {
    itemCount: number;
    chunkBy: 'day' | 'week' | 'month' | 'year';
    sortDirection: 'asc' | 'desc';
    testName: string;
  }) => {
    const { itemCount, chunkBy, sortDirection, testName } = testConfig;
    
    // Reset measurements
    resetMeasurements();
    
    // Set current test
    setCurrentTest(testName);
    
    // Generate tasks
    const tasks = await generateTasks(itemCount);
    
    // Update component configuration
    setChunkBy(chunkBy);
    setSortDirection(sortDirection);
    
    // Start monitoring
    startMonitoring();
    
    // Wait for initial render and measurements
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Stop monitoring
    stopMonitoring();
    
    // Collect metrics
    const metrics: PerformanceMetrics = {
      testName,
      testDescription: `${itemCount} items, chunked by ${chunkBy}, sorted ${sortDirection}`,
      testParameters: {
        itemCount,
        chunkBy,
        sortDirection,
        dayRange,
      },
      renderTime: initialRenderTime,
      reRenderTime: reRenderTimes.length > 0 ? reRenderTimes[reRenderTimes.length - 1] : undefined,
      scrollingPerformance: fpsMeasurements,
      memoryUsage: memoryMeasurements,
      timestamp: new Date(),
    };
    
    // Add to test results
    setTestResults(prev => [...prev, metrics]);
    
    // Clear current test
    setCurrentTest(null);
    
    return metrics;
  }, [
    generateTasks,
    resetMeasurements,
    startMonitoring,
    stopMonitoring,
    initialRenderTime,
    reRenderTimes,
    fpsMeasurements,
    memoryMeasurements,
    dayRange,
  ]);
  
  // Run a series of tests with increasing item counts
  const runStressTest = useCallback(async () => {
    const itemCounts = [100, 250, 500, 1000, 2500, 5000];
    const chunkOptions: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month'];
    
    // Clear previous results
    setTestResults([]);
    
    // Run tests for each item count and chunking option
    for (const count of itemCounts) {
      for (const chunk of chunkOptions) {
        await runTest({
          itemCount: count,
          chunkBy: chunk,
          sortDirection: 'asc',
          testName: `${count} items - ${chunk}`,
        });
        
        // Short delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }, [runTest]);
  
  // Run a custom test with current configuration
  const runCustomTest = useCallback(async () => {
    await runTest({
      itemCount,
      chunkBy,
      sortDirection,
      testName: `Custom - ${itemCount} items`,
    });
  }, [runTest, itemCount, chunkBy, sortDirection]);
  
  // Clear test results
  const clearResults = useCallback(() => {
    setTestResults([]);
  }, []);
  
  // Generate initial tasks on mount
  useEffect(() => {
    generateTasks(itemCount);
  }, [generateTasks, itemCount]);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Timeline Stress Testing</h1>
      <p className="mb-6">
        Test timeline performance with extreme item counts and different configurations.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure stress test parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="itemCount">Item Count: {itemCount}</Label>
              <Slider
                id="itemCount"
                min={100}
                max={10000}
                step={100}
                value={[itemCount]}
                onValueChange={(value) => setItemCount(value[0])}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="chunkBy">Chunk By</Label>
              <Select
                value={chunkBy}
                onValueChange={(value) => setChunkBy(value as any)}
              >
                <SelectTrigger id="chunkBy">
                  <SelectValue placeholder="Select chunking method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sortDirection">Sort Direction</Label>
              <Select
                value={sortDirection}
                onValueChange={(value) => setSortDirection(value as any)}
              >
                <SelectTrigger id="sortDirection">
                  <SelectValue placeholder="Select sort direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dayRange">Day Range: {dayRange}</Label>
              <Slider
                id="dayRange"
                min={30}
                max={365}
                step={30}
                value={[dayRange]}
                onValueChange={(value) => setDayRange(value[0])}
              />
            </div>
            
            <div className="pt-4 space-y-2">
              <Button
                onClick={() => generateTasks(itemCount)}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Tasks'
                )}
              </Button>
              
              <Button
                onClick={runCustomTest}
                disabled={isGenerating || currentTest !== null}
                variant="secondary"
                className="w-full"
              >
                Run Custom Test
              </Button>
              
              <Button
                onClick={runStressTest}
                disabled={isGenerating || currentTest !== null}
                variant="destructive"
                className="w-full"
              >
                Run Full Stress Test
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Current Test Status */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Current Test Status</CardTitle>
            <CardDescription>
              {currentTest ? `Running: ${currentTest}` : 'No test running'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Initial Render Time:</p>
                <p className="text-2xl font-bold">
                  {initialRenderTime ? formatDuration(initialRenderTime.duration) : 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Re-render Time:</p>
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
              
              <div>
                <p className="text-sm font-medium">Tests Completed:</p>
                <p className="text-2xl font-bold">
                  {testResults.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Timeline View */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Timeline Preview</CardTitle>
          <CardDescription>
            {tasks.length} items, chunked by {chunkBy}, sorted {sortDirection}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px' }}>
            <ChunkedTimelineView
              tasks={tasks}
              height={350}
              onTaskClick={() => {}}
              title={`${tasks.length} items`}
              chunkBy={chunkBy}
              sortDirection={sortDirection}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-8">
          <PerformanceReport
            metrics={testResults}
            onClear={clearResults}
          />
        </div>
      )}
    </div>
  );
}
