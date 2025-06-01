import fs from 'fs';
import path from 'path';

export interface BenchmarkResult {
  name: string;
  timestamp: number;
  metrics: {
    renderTime: number;
    memoryUsage: number;
    bundleSize: number;
    fpsAverage: number;
    loadTime: number;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cpus: number;
  };
}

export interface BenchmarkThresholds {
  renderTime: number; // ms
  memoryUsage: number; // bytes
  bundleSize: number; // bytes
  fpsAverage: number; // fps
  loadTime: number; // ms
}

export class PerformanceBenchmark {
  private benchmarkFile: string;
  private thresholds: BenchmarkThresholds;

  constructor(
    benchmarkFile: string = 'performance-benchmarks.json',
    thresholds: BenchmarkThresholds = {
      renderTime: 100,
      memoryUsage: 50 * 1024 * 1024, // 50MB
      bundleSize: 5 * 1024 * 1024, // 5MB
      fpsAverage: 30,
      loadTime: 3000, // 3 seconds
    }
  ) {
    this.benchmarkFile = path.join(process.cwd(), benchmarkFile);
    this.thresholds = thresholds;
  }

  /**
   * Save a benchmark result
   */
  async saveBenchmark(result: BenchmarkResult): Promise<void> {
    const benchmarks = await this.loadBenchmarks();
    benchmarks.push(result);

    // Keep only last 100 benchmarks
    if (benchmarks.length > 100) {
      benchmarks.splice(0, benchmarks.length - 100);
    }

    await fs.promises.writeFile(
      this.benchmarkFile,
      JSON.stringify(benchmarks, null, 2)
    );
  }

  /**
   * Load existing benchmarks
   */
  async loadBenchmarks(): Promise<BenchmarkResult[]> {
    try {
      if (fs.existsSync(this.benchmarkFile)) {
        const data = await fs.promises.readFile(this.benchmarkFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load benchmarks:', error);
    }
    return [];
  }

  /**
   * Compare current benchmark with historical data
   */
  async compareWithBaseline(current: BenchmarkResult): Promise<{
    isRegression: boolean;
    regressions: string[];
    improvements: string[];
    comparison: Record<string, { current: number; baseline: number; change: number }>;
  }> {
    const benchmarks = await this.loadBenchmarks();
    
    if (benchmarks.length === 0) {
      return {
        isRegression: false,
        regressions: [],
        improvements: [],
        comparison: {},
      };
    }

    // Use last 10 benchmarks as baseline
    const recentBenchmarks = benchmarks.slice(-10);
    const baseline = this.calculateBaseline(recentBenchmarks);

    const comparison: Record<string, { current: number; baseline: number; change: number }> = {};
    const regressions: string[] = [];
    const improvements: string[] = [];

    // Compare each metric
    Object.keys(current.metrics).forEach(metric => {
      const currentValue = current.metrics[metric as keyof typeof current.metrics];
      const baselineValue = baseline[metric as keyof typeof baseline];
      const change = ((currentValue - baselineValue) / baselineValue) * 100;

      comparison[metric] = {
        current: currentValue,
        baseline: baselineValue,
        change,
      };

      // Check for regressions (higher is worse for most metrics except FPS)
      const isRegression = metric === 'fpsAverage' 
        ? change < -10 // FPS decrease of 10% is bad
        : change > 20; // Other metrics increase of 20% is bad

      if (isRegression) {
        regressions.push(`${metric}: ${change.toFixed(1)}% ${metric === 'fpsAverage' ? 'decrease' : 'increase'}`);
      } else if (
        (metric === 'fpsAverage' && change > 10) || 
        (metric !== 'fpsAverage' && change < -10)
      ) {
        improvements.push(`${metric}: ${Math.abs(change).toFixed(1)}% ${metric === 'fpsAverage' ? 'increase' : 'decrease'}`);
      }
    });

    return {
      isRegression: regressions.length > 0,
      regressions,
      improvements,
      comparison,
    };
  }

  /**
   * Check if current metrics exceed thresholds
   */
  checkThresholds(metrics: BenchmarkResult['metrics']): {
    passed: boolean;
    failures: string[];
  } {
    const failures: string[] = [];

    if (metrics.renderTime > this.thresholds.renderTime) {
      failures.push(`Render time ${metrics.renderTime}ms exceeds threshold ${this.thresholds.renderTime}ms`);
    }

    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      failures.push(`Memory usage ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB exceeds threshold ${(this.thresholds.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    if (metrics.bundleSize > this.thresholds.bundleSize) {
      failures.push(`Bundle size ${(metrics.bundleSize / 1024 / 1024).toFixed(1)}MB exceeds threshold ${(this.thresholds.bundleSize / 1024 / 1024).toFixed(1)}MB`);
    }

    if (metrics.fpsAverage < this.thresholds.fpsAverage) {
      failures.push(`Average FPS ${metrics.fpsAverage} below threshold ${this.thresholds.fpsAverage}`);
    }

    if (metrics.loadTime > this.thresholds.loadTime) {
      failures.push(`Load time ${metrics.loadTime}ms exceeds threshold ${this.thresholds.loadTime}ms`);
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  /**
   * Calculate baseline from recent benchmarks
   */
  private calculateBaseline(benchmarks: BenchmarkResult[]): BenchmarkResult['metrics'] {
    if (benchmarks.length === 0) {
      throw new Error('No benchmarks available for baseline calculation');
    }

    const metrics = benchmarks.map(b => b.metrics);
    
    return {
      renderTime: this.calculateMedian(metrics.map(m => m.renderTime)),
      memoryUsage: this.calculateMedian(metrics.map(m => m.memoryUsage)),
      bundleSize: this.calculateMedian(metrics.map(m => m.bundleSize)),
      fpsAverage: this.calculateMedian(metrics.map(m => m.fpsAverage)),
      loadTime: this.calculateMedian(metrics.map(m => m.loadTime)),
    };
  }

  /**
   * Calculate median value (more robust than average for performance metrics)
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<string> {
    const benchmarks = await this.loadBenchmarks();
    
    if (benchmarks.length === 0) {
      return 'No benchmark data available.';
    }

    const latest = benchmarks[benchmarks.length - 1];
    const comparison = await this.compareWithBaseline(latest);
    const thresholdCheck = this.checkThresholds(latest.metrics);

    let report = `# Performance Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Latest Benchmark:** ${new Date(latest.timestamp).toISOString()}\n\n`;

    report += `## Current Metrics\n\n`;
    report += `- **Render Time:** ${latest.metrics.renderTime.toFixed(2)}ms\n`;
    report += `- **Memory Usage:** ${(latest.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- **Bundle Size:** ${(latest.metrics.bundleSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- **Average FPS:** ${latest.metrics.fpsAverage.toFixed(1)}\n`;
    report += `- **Load Time:** ${latest.metrics.loadTime.toFixed(2)}ms\n\n`;

    if (!thresholdCheck.passed) {
      report += `## ⚠️ Threshold Violations\n\n`;
      thresholdCheck.failures.forEach(failure => {
        report += `- ${failure}\n`;
      });
      report += `\n`;
    }

    if (comparison.regressions.length > 0) {
      report += `## 📉 Performance Regressions\n\n`;
      comparison.regressions.forEach(regression => {
        report += `- ${regression}\n`;
      });
      report += `\n`;
    }

    if (comparison.improvements.length > 0) {
      report += `## 📈 Performance Improvements\n\n`;
      comparison.improvements.forEach(improvement => {
        report += `- ${improvement}\n`;
      });
      report += `\n`;
    }

    return report;
  }
}
