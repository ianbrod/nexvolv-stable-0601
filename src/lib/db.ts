// src/lib/db.ts
import Dexie, { Table } from 'dexie';
import { Goal, Category, Task, Reminder } from '@/types';
import { logDatabase } from '@/lib/debug';

/**
 * Current database schema version
 * Increment this number when making schema changes
 *
 * Version history:
 * 1: Initial schema with goals and categories
 * 2: Added tasks table
 * 3400: Fix for version mismatch error
 * 3500: Added bookends, reminders, and habits tables
 * 4000: Updated habits table with proper type definition
 * 60000: Fix for version mismatch error with existing database (v50000)
 * 70000: Removed habits and bookends tables
 * 9500000: Fix for version mismatch error with existing database (v9000000)
 *
 * Note: We use a high version number to ensure it's higher than any
 * existing version in the browser's IndexedDB to avoid version conflicts.
 */
const CURRENT_SCHEMA_VERSION = 9500000;

export class NexVolvDexie extends Dexie {
  // Declare tables (object stores)
  goals!: Table<Goal>;
  categories!: Table<Category>;
  tasks!: Table<Task>;
  reminders!: Table<Reminder>;

  constructor() {
    super('nexvolvDatabase'); // Database name

    // Define the current schema version
    // This approach consolidates all previous versions into a single version
    // to simplify schema management
    this.version(CURRENT_SCHEMA_VERSION).stores({
      goals: 'id, name, status, category, parentGoalId, createdAt, targetCompletionDate',
      categories: 'id, name',
      tasks: 'id, name, status, priority, dueDate, goalId, createdAt',
      reminders: 'id, title, dueDate, isRecurring, taskId, userId, isCompleted, createdAt'
    }).upgrade(tx => {
      logDatabase(`Upgrading database schema to version ${CURRENT_SCHEMA_VERSION}...`);

      // Migration logic can be added here if needed
      // For example, if we need to transform data from an old format to a new format

      return Promise.resolve();
    });
  }
}

// Create a singleton instance of the database
export const db = new NexVolvDexie();

// --- Basic CRUD Operations for Goals ---

export async function addGoal(goalData: Omit<Goal, 'id' | 'createdAt'>): Promise<any> {
  const newGoal: Goal = {
    ...goalData,
    id: crypto.randomUUID(), // Generate a UUID for the ID
    createdAt: new Date(),
    status: goalData.status || 'Active', // Default status
    // Ensure parentGoalId is null if not provided
    parentGoalId: goalData.parentGoalId || null,
  };
  return await db.goals.add(newGoal);
}

export async function getGoals(): Promise<Goal[]> {
  return await db.goals.toArray();
}

// Get only top-level goals (no parentGoalId)
export async function getTopLevelGoals(): Promise<Goal[]> {
    // Dexie's filter doesn't directly support checking for null/undefined easily across browsers in older versions.
    // It's often more reliable to fetch all and filter in memory, or use where clauses on defined indexes.
    // Let's filter in memory for simplicity here.
    const allGoals = await db.goals.toArray();
    return allGoals.filter((goal: Goal) => !goal.parentGoalId);
}

export async function updateGoal(id: string, changes: Partial<Goal>): Promise<number> {
  // Ensure id is not accidentally changed
  const { id: _, ...updates } = changes;
  return await db.goals.update(id, updates);
}

export async function deleteGoal(id: string): Promise<void> {
  // TODO: Handle deleting sub-goals or associated tasks if necessary
  return await db.goals.delete(id);
}



// --- Basic CRUD Operations for Categories (Example) ---

export async function addCategory(categoryData: Omit<Category, 'id'>): Promise<any> {
  const newCategory: Category = {
    ...categoryData,
    id: crypto.randomUUID(),
  };
  return await db.categories.add(newCategory);
}

export async function getCategories(): Promise<Category[]> {
  return await db.categories.toArray();
}

export async function updateCategory(id: string, changes: Partial<Omit<Category, 'id'>>): Promise<number> {
  return await db.categories.update(id, changes);
}

export async function deleteCategory(id: string): Promise<void> {
  // TODO: Consider how to handle goals associated with this category.
  // Option 1: Set category field on goals to null/undefined.
  // Option 2: Leave goal category as is (might show stale category name).
  // For V1 simplicity, let's just delete the category itself.
  console.log(`Deleting category: ${id}`);
  return await db.categories.delete(id);
}

// Seed initial categories if the DB is empty (optional)
// Uncomment and adjust to use addCategory
db.on('ready', async () => {
  // Use transaction to ensure atomicity if needed, though unlikely necessary for simple seeding
  await db.transaction('rw', db.categories, async () => {
    const count = await db.categories.count();
    if (count === 0) {
      console.log("Seeding initial categories...");
      // Use existing mockCategories for consistency or define here
      const initialCategories = [
        { name: 'Personal Growth', color: '#3b82f6' }, // blue
        { name: 'Career Development', color: '#10b981' }, // green
        { name: 'Health & Fitness', color: '#ef4444' }, // red
      ];
      for (const cat of initialCategories) {
        try {
          await addCategory(cat);
        } catch (error) {
          console.error(`Failed to seed category ${cat.name}:`, error);
        }
      }
      console.log("Category seeding complete.");
    }
  }).catch(e => {
      console.error("Failed to open transaction for category seeding:", e);
  });
});

// --- Basic CRUD Operations for Tasks ---

export async function addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'status'>): Promise<any> {
  const newTask: Task = {
    ...taskData,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    status: 'TODO', // Default status
    dueDate: taskData.dueDate || null,
    goalId: taskData.goalId || null,
    completedAt: null,
    startedAt: null,
    recurrencePattern: 'NONE',
    updatedAt: new Date(),
  };
  return await db.tasks.add(newTask);
}

export async function getTasks(): Promise<Task[]> {
  // Add sorting by creation date or status later if needed
  return await db.tasks.toArray();
}

export async function updateTask(id: string, changes: Partial<Task>): Promise<number> {
  const { id: _, ...updates } = changes;
  // Update timestamps based on status
  if (updates.status === 'COMPLETED' && changes.status !== undefined) {
      updates.completedAt = new Date();
  } else if (updates.status === 'IN_PROGRESS' && changes.status !== undefined) {
      // Set startedAt if moving to IN_PROGRESS and not already set
      if (!updates.startedAt) {
          updates.startedAt = new Date();
      }
      // Clear completedAt
      updates.completedAt = null;
  } else if (updates.status === 'TODO' && changes.status !== undefined) {
      // Clear completedAt if moving back to TODO
      updates.completedAt = null;
      // Keep startedAt if it was set
  }

  // Always update the updatedAt timestamp
  updates.updatedAt = new Date();

  return await db.tasks.update(id, updates);
}

export async function deleteTask(id: string): Promise<void> {
  return await db.tasks.delete(id);
}