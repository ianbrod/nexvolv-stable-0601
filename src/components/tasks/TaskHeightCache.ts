'use client';

import { Task } from '@prisma/client';

/**
 * A cache for storing and retrieving task item heights
 */
export class TaskHeightCache {
  private heights: Map<string, number>;
  private defaultHeight: number;
  private contentBasedEstimator: (task: Task) => number;

  /**
   * Creates a new TaskHeightCache
   * @param defaultHeight The default height to use when a task's height is not in the cache
   * @param contentBasedEstimator A function that estimates a task's height based on its content
   */
  constructor(defaultHeight: number = 90, contentBasedEstimator?: (task: Task) => number) {
    this.heights = new Map<string, number>();
    this.defaultHeight = defaultHeight;
    this.contentBasedEstimator = contentBasedEstimator || this.defaultEstimator;
  }

  /**
   * Gets the height for a task
   * @param taskId The ID of the task
   * @param task The task object (used for estimation if height is not cached)
   * @returns The height of the task
   */
  getHeight(taskId: string, task?: Task): number {
    // If we have a cached height, return it
    if (this.heights.has(taskId)) {
      return this.heights.get(taskId) || this.defaultHeight;
    }

    // If we have a task object, estimate its height
    if (task) {
      const estimatedHeight = this.contentBasedEstimator(task);
      this.setHeight(taskId, estimatedHeight);
      return estimatedHeight;
    }

    // Otherwise, return the default height
    return this.defaultHeight;
  }

  /**
   * Sets the height for a task
   * @param taskId The ID of the task
   * @param height The height of the task
   */
  setHeight(taskId: string, height: number): void {
    this.heights.set(taskId, height);
  }

  /**
   * Clears the height for a task
   * @param taskId The ID of the task
   */
  clearHeight(taskId: string): void {
    this.heights.delete(taskId);
  }

  /**
   * Clears all heights from the cache
   */
  clearAll(): void {
    this.heights.clear();
  }

  /**
   * Gets all heights from the cache
   * @returns A Map of task IDs to heights
   */
  getAllHeights(): Map<string, number> {
    return new Map(this.heights);
  }

  /**
   * Default estimator function that calculates height based on task content
   * @param task The task to estimate the height for
   * @returns The estimated height
   */
  private defaultEstimator(task: Task): number {
    // Base height for the task item
    let height = this.defaultHeight;

    // Add height for longer task names (assuming ~20 chars per line at ~20px per line)
    if (task.name) {
      const nameLines = Math.ceil(task.name.length / 20);
      if (nameLines > 1) {
        height += (nameLines - 1) * 20;
      }
    }

    // Add height for description if present
    if (task.description) {
      // Estimate ~50 chars per line at ~18px per line
      const descriptionLines = Math.ceil(task.description.length / 50);
      height += descriptionLines * 18;
    }

    // Add height for tags if present
    if (task.tags && task.tags.length > 0) {
      // Add 24px if there are tags (assuming they fit on one line)
      height += 24;
    }

    // Add some padding
    height += 10;

    return height;
  }
}

/**
 * A singleton instance of TaskHeightCache
 */
export const taskHeightCache = new TaskHeightCache();
