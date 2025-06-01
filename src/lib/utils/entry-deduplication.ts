import { LogEntry } from '@/types';

/**
 * Deduplicate log entries by ID, keeping the most recent version
 * This prevents React key conflicts and duplicate entries in the UI
 */
export function deduplicateEntries(entries: LogEntry[]): LogEntry[] {
  return entries.reduce((acc, entry) => {
    const existingIndex = acc.findIndex(e => e.id === entry.id);
    
    if (existingIndex >= 0) {
      // Keep the most recent version (by updatedAt)
      const existing = acc[existingIndex];
      const entryDate = new Date(entry.updatedAt).getTime();
      const existingDate = new Date(existing.updatedAt).getTime();
      
      if (entryDate > existingDate) {
        acc[existingIndex] = entry;
      }
      // If existing is newer or same, keep it (do nothing)
    } else {
      // New entry, add it
      acc.push(entry);
    }
    
    return acc;
  }, [] as LogEntry[]);
}

/**
 * Generate a unique ID for log entries
 * Uses crypto.randomUUID() if available, falls back to timestamp + random string
 */
export function generateUniqueId(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return `entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Validate that an entry has a unique ID
 * If not, generate a new one
 */
export function ensureUniqueId(entry: LogEntry): LogEntry {
  if (!entry.id || entry.id === 'undefined' || entry.id === 'null') {
    return {
      ...entry,
      id: generateUniqueId()
    };
  }
  
  return entry;
}
