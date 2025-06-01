/**
 * Custom event system for real-time updates across components
 */

// Define event types
export type ProgressUpdateEvent = {
  goalId: string;
  progress: number;
};

// Define callback types
export type EventCallback = (data: any) => void;
export type ProgressUpdateCallback = (data: ProgressUpdateEvent) => void;

// Create a custom event emitter
class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  // Subscribe to an event
  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  // Emit an event
  emit(event: string, data?: any) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }
}

// Create a singleton instance
export const eventEmitter = new EventEmitter();

// Event names
export const EVENTS = {
  PROGRESS_UPDATED: 'progress-updated',
};

/**
 * Helper function to emit progress update events
 * @param goalId The ID of the goal whose progress has been updated
 * @param progress The new progress value (0-100)
 */
export function emitProgressUpdate(goalId: string, progress: number) {
  console.log(`Emitting progress update for goal ${goalId}: ${progress}%`);
  eventEmitter.emit(EVENTS.PROGRESS_UPDATED, { goalId, progress });
}
