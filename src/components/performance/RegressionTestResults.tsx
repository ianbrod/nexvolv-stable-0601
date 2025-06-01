'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatDuration, formatMemorySize, PerformanceMetrics } from '@/lib/utils/performance-utils';
import { RegressionTestResult, checkPerformanceBudget, detectPerformanceRegression } from '@/lib/utils/performance-regression';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface RegressionTestResultsProps {
  /** Current test metrics */
  currentMetrics: PerformanceMetrics;
  /** Baseline metrics for comparison */
  baselineMetrics?: PerformanceMetrics;
  /** Custom performance budget */
  performanceBudget?: {
    maxInitialRenderTime?: number;
    maxReRenderTime?: number;
    minScrollingFPS?: number;
    maxMemoryUsage?: number;
    maxMemoryPerItem?: number;
  };
}

export function RegressionTestResults({
  currentMetrics,
  baselineMetrics,
  performanceBudget,
}: RegressionTestResultsProps) {
  // Check if current metrics meet the performance budget
  const budgetResult = checkPerformanceBudget(currentMetrics, performanceBudget);
  
  // Check for regressions if baseline metrics are provided
  const regressionResult = baselineMetrics
    ? detectPerformanceRegression(baselineMetrics, currentMetrics)
    : null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          Performance Test Results
          {budgetResult.passed ? (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-4 w-4 mr-1" />
              Passed
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-4 w-4 mr-1" />
              Failed
            </Badge>
          )}
          {regressionResult?.hasRegression && (
            <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Regression
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Test: {currentMetrics.testName || 'Unnamed Test'}
          {currentMetrics.testDescription && ` - ${currentMetrics.testDescription}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Budget Violations */}
        {!budgetResult.passed && (
          <Alert variant="destructive">
            <AlertTitle>Performance Budget Violations</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {budgetResult.violations.initialRenderTime && (
                  <li>
                    Initial render time: {formatDuration(budgetResult.violations.initialRenderTime.actual)} exceeds budget of {formatDuration(budgetResult.violations.initialRenderTime.threshold)} by {budgetResult.violations.initialRenderTime.percentOver.toFixed(1)}%
                  </li>
                )}
                {budgetResult.violations.reRenderTime && (
                  <li>
                    Re-render time: {formatDuration(budgetResult.violations.reRenderTime.actual)} exceeds budget of {formatDuration(budgetResult.violations.reRenderTime.threshold)} by {budgetResult.violations.reRenderTime.percentOver.toFixed(1)}%
                  </li>
                )}
                {budgetResult.violations.scrollingFPS && (
                  <li>
                    Scrolling FPS: {budgetResult.violations.scrollingFPS.actual.toFixed(1)} is below budget of {budgetResult.violations.scrollingFPS.threshold.toFixed(1)} by {budgetResult.violations.scrollingFPS.percentUnder.toFixed(1)}%
                  </li>
                )}
                {budgetResult.violations.memoryUsage && (
                  <li>
                    Memory usage: {formatMemorySize(budgetResult.violations.memoryUsage.actual)} exceeds budget of {formatMemorySize(budgetResult.violations.memoryUsage.threshold)} by {budgetResult.violations.memoryUsage.percentOver.toFixed(1)}%
                  </li>
                )}
                {budgetResult.violations.memoryPerItem && (
                  <li>
                    Memory per item: {formatMemorySize(budgetResult.violations.memoryPerItem.actual)} exceeds budget of {formatMemorySize(budgetResult.violations.memoryPerItem.threshold)} by {budgetResult.violations.memoryPerItem.percentOver.toFixed(1)}%
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Regressions */}
        {regressionResult?.hasRegression && (
          <Alert variant="warning">
            <AlertTitle>Performance Regressions Detected</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {regressionResult.regressions.initialRenderTime && (
                  <li>
                    Initial render time: {formatDuration(regressionResult.regressions.initialRenderTime.current)} is {regressionResult.regressions.initialRenderTime.percentChange.toFixed(1)}% slower than baseline ({formatDuration(regressionResult.regressions.initialRenderTime.baseline)})
                  </li>
                )}
                {regressionResult.regressions.reRenderTime && (
                  <li>
                    Re-render time: {formatDuration(regressionResult.regressions.reRenderTime.current)} is {regressionResult.regressions.reRenderTime.percentChange.toFixed(1)}% slower than baseline ({formatDuration(regressionResult.regressions.reRenderTime.baseline)})
                  </li>
                )}
                {regressionResult.regressions.scrollingFPS && (
                  <li>
                    Scrolling FPS: {regressionResult.regressions.scrollingFPS.current.toFixed(1)} is {regressionResult.regressions.scrollingFPS.percentChange.toFixed(1)}% lower than baseline ({regressionResult.regressions.scrollingFPS.baseline.toFixed(1)})
                  </li>
                )}
                {regressionResult.regressions.memoryUsage && (
                  <li>
                    Memory usage: {formatMemorySize(regressionResult.regressions.memoryUsage.current)} is {regressionResult.regressions.memoryUsage.percentChange.toFixed(1)}% higher than baseline ({formatMemorySize(regressionResult.regressions.memoryUsage.baseline)})
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Metrics Table */}
        <div>
          <h3 className="text-lg font-medium mb-2">Performance Metrics</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Current</TableHead>
                {baselineMetrics && <TableHead>Baseline</TableHead>}
                {baselineMetrics && <TableHead>Change</TableHead>}
                {performanceBudget && <TableHead>Budget</TableHead>}
                {performanceBudget && <TableHead>Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Initial Render Time */}
              <TableRow>
                <TableCell>Initial Render Time</TableCell>
                <TableCell>{currentMetrics.renderTime ? formatDuration(currentMetrics.renderTime.duration) : 'N/A'}</TableCell>
                {baselineMetrics && (
                  <TableCell>
                    {baselineMetrics.renderTime ? formatDuration(baselineMetrics.renderTime.duration) : 'N/A'}
                  </TableCell>
                )}
                {baselineMetrics && (
                  <TableCell>
                    {currentMetrics.renderTime && baselineMetrics.renderTime ? (
                      <span className={
                        currentMetrics.renderTime.duration > baselineMetrics.renderTime.duration
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {((currentMetrics.renderTime.duration - baselineMetrics.renderTime.duration) / baselineMetrics.renderTime.duration * 100).toFixed(1)}%
                      </span>
                    ) : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {performanceBudget.maxInitialRenderTime ? formatDuration(performanceBudget.maxInitialRenderTime) : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {currentMetrics.renderTime && performanceBudget.maxInitialRenderTime ? (
                      currentMetrics.renderTime.duration <= performanceBudget.maxInitialRenderTime ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )
                    ) : 'N/A'}
                  </TableCell>
                )}
              </TableRow>
              
              {/* Re-render Time */}
              <TableRow>
                <TableCell>Re-render Time</TableCell>
                <TableCell>{currentMetrics.reRenderTime ? formatDuration(currentMetrics.reRenderTime.duration) : 'N/A'}</TableCell>
                {baselineMetrics && (
                  <TableCell>
                    {baselineMetrics.reRenderTime ? formatDuration(baselineMetrics.reRenderTime.duration) : 'N/A'}
                  </TableCell>
                )}
                {baselineMetrics && (
                  <TableCell>
                    {currentMetrics.reRenderTime && baselineMetrics.reRenderTime ? (
                      <span className={
                        currentMetrics.reRenderTime.duration > baselineMetrics.reRenderTime.duration
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {((currentMetrics.reRenderTime.duration - baselineMetrics.reRenderTime.duration) / baselineMetrics.reRenderTime.duration * 100).toFixed(1)}%
                      </span>
                    ) : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {performanceBudget.maxReRenderTime ? formatDuration(performanceBudget.maxReRenderTime) : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {currentMetrics.reRenderTime && performanceBudget.maxReRenderTime ? (
                      currentMetrics.reRenderTime.duration <= performanceBudget.maxReRenderTime ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )
                    ) : 'N/A'}
                  </TableCell>
                )}
              </TableRow>
              
              {/* Scrolling FPS */}
              <TableRow>
                <TableCell>Scrolling FPS</TableCell>
                <TableCell>
                  {currentMetrics.scrollingPerformance && currentMetrics.scrollingPerformance.length > 0
                    ? (currentMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / currentMetrics.scrollingPerformance.length).toFixed(1)
                    : 'N/A'}
                </TableCell>
                {baselineMetrics && (
                  <TableCell>
                    {baselineMetrics.scrollingPerformance && baselineMetrics.scrollingPerformance.length > 0
                      ? (baselineMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / baselineMetrics.scrollingPerformance.length).toFixed(1)
                      : 'N/A'}
                  </TableCell>
                )}
                {baselineMetrics && (
                  <TableCell>
                    {currentMetrics.scrollingPerformance && currentMetrics.scrollingPerformance.length > 0 &&
                     baselineMetrics.scrollingPerformance && baselineMetrics.scrollingPerformance.length > 0 ? (
                      <span className={
                        (currentMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / currentMetrics.scrollingPerformance.length) <
                        (baselineMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / baselineMetrics.scrollingPerformance.length)
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {(((currentMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / currentMetrics.scrollingPerformance.length) -
                           (baselineMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / baselineMetrics.scrollingPerformance.length)) /
                           (baselineMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / baselineMetrics.scrollingPerformance.length) * 100).toFixed(1)}%
                      </span>
                    ) : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {performanceBudget.minScrollingFPS ? `${performanceBudget.minScrollingFPS.toFixed(1)}` : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {currentMetrics.scrollingPerformance && currentMetrics.scrollingPerformance.length > 0 && performanceBudget.minScrollingFPS ? (
                      (currentMetrics.scrollingPerformance.reduce((sum, m) => sum + m.fps, 0) / currentMetrics.scrollingPerformance.length) >= performanceBudget.minScrollingFPS ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )
                    ) : 'N/A'}
                  </TableCell>
                )}
              </TableRow>
              
              {/* Memory Usage */}
              <TableRow>
                <TableCell>Memory Usage</TableCell>
                <TableCell>
                  {currentMetrics.memoryUsage && currentMetrics.memoryUsage.length > 0
                    ? formatMemorySize(Math.max(...currentMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0)))
                    : 'N/A'}
                </TableCell>
                {baselineMetrics && (
                  <TableCell>
                    {baselineMetrics.memoryUsage && baselineMetrics.memoryUsage.length > 0
                      ? formatMemorySize(Math.max(...baselineMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0)))
                      : 'N/A'}
                  </TableCell>
                )}
                {baselineMetrics && (
                  <TableCell>
                    {currentMetrics.memoryUsage && currentMetrics.memoryUsage.length > 0 &&
                     baselineMetrics.memoryUsage && baselineMetrics.memoryUsage.length > 0 ? (
                      <span className={
                        Math.max(...currentMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0)) >
                        Math.max(...baselineMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0))
                          ? 'text-red-600'
                          : 'text-green-600'
                      }>
                        {((Math.max(...currentMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0)) -
                           Math.max(...baselineMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0))) /
                           Math.max(...baselineMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0)) * 100).toFixed(1)}%
                      </span>
                    ) : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {performanceBudget.maxMemoryUsage ? formatMemorySize(performanceBudget.maxMemoryUsage) : 'N/A'}
                  </TableCell>
                )}
                {performanceBudget && (
                  <TableCell>
                    {currentMetrics.memoryUsage && currentMetrics.memoryUsage.length > 0 && performanceBudget.maxMemoryUsage ? (
                      Math.max(...currentMetrics.memoryUsage.map(m => m.usedJSHeapSize || 0)) <= performanceBudget.maxMemoryUsage ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )
                    ) : 'N/A'}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        Test run at {new Date(currentMetrics.timestamp).toLocaleString()}
      </CardFooter>
    </Card>
  );
}
