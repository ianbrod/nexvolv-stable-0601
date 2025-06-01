import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncTasks } from '../sync-tasks';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    tasks: {
      toArray: vi.fn(),
      bulkAdd: vi.fn(),
      update: vi.fn(),
      bulkDelete: vi.fn(),
    },
  },
}));

describe('syncTasks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock console methods to avoid cluttering test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should add tasks that exist on server but not in client', async () => {
    // Mock client tasks (empty)
    (db.tasks.toArray as any).mockResolvedValue([]);

    // Mock server tasks
    const serverTasks = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'Description 1',
        priority: 'MEDIUM',
        status: 'TODO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Call the function
    const result = await syncTasks(serverTasks);

    // Verify that bulkAdd was called with the server task
    expect(db.tasks.bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'task1',
        name: 'Task 1',
        description: 'Description 1',
      }),
    ]);

    // Verify the result
    expect(result).toEqual({
      added: 1,
      updated: 0,
      removed: 0,
    });
  });

  it('should update tasks that exist in both client and server but have different properties', async () => {
    // Mock client tasks
    const clientTasks = [
      {
        id: 'task1',
        name: 'Task 1 Old',
        description: 'Description 1 Old',
        priority: 'LOW',
        status: 'TODO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    (db.tasks.toArray as any).mockResolvedValue(clientTasks);

    // Mock server tasks with updated properties
    const serverTasks = [
      {
        id: 'task1',
        name: 'Task 1 Updated',
        description: 'Description 1 Updated',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        createdAt: clientTasks[0].createdAt,
        updatedAt: new Date().toISOString(),
      },
    ];

    // Call the function
    const result = await syncTasks(serverTasks);

    // Verify that update was called with the updated properties
    expect(db.tasks.update).toHaveBeenCalledWith(
      'task1',
      expect.objectContaining({
        name: 'Task 1 Updated',
        description: 'Description 1 Updated',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
      })
    );

    // Verify the result
    expect(result).toEqual({
      added: 0,
      updated: 1,
      removed: 0,
    });
  });

  it('should remove tasks that exist in client but not on server', async () => {
    // Mock client tasks
    const clientTasks = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'Description 1',
        priority: 'MEDIUM',
        status: 'TODO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Description 2',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    (db.tasks.toArray as any).mockResolvedValue(clientTasks);

    // Mock server tasks (only one task exists)
    const serverTasks = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'Description 1',
        priority: 'MEDIUM',
        status: 'TODO',
        createdAt: clientTasks[0].createdAt,
        updatedAt: clientTasks[0].updatedAt,
      },
    ];

    // Call the function
    const result = await syncTasks(serverTasks);

    // Verify that bulkDelete was called with the task that doesn't exist on server
    expect(db.tasks.bulkDelete).toHaveBeenCalledWith(['task2']);

    // Verify the result
    expect(result).toEqual({
      added: 0,
      updated: 0,
      removed: 1,
    });
  });

  it('should handle a mix of add, update, and remove operations', async () => {
    // Mock client tasks
    const clientTasks = [
      {
        id: 'task1',
        name: 'Task 1 Old',
        description: 'Description 1 Old',
        priority: 'LOW',
        status: 'TODO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Description 2',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    (db.tasks.toArray as any).mockResolvedValue(clientTasks);

    // Mock server tasks
    const serverTasks = [
      {
        id: 'task1',
        name: 'Task 1 Updated',
        description: 'Description 1 Updated',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        createdAt: clientTasks[0].createdAt,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task3',
        name: 'Task 3',
        description: 'Description 3',
        priority: 'MEDIUM',
        status: 'TODO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Call the function
    const result = await syncTasks(serverTasks);

    // Verify that bulkAdd was called with the new task
    expect(db.tasks.bulkAdd).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'task3',
        name: 'Task 3',
        description: 'Description 3',
      }),
    ]);

    // Verify that update was called with the updated properties
    expect(db.tasks.update).toHaveBeenCalledWith(
      'task1',
      expect.objectContaining({
        name: 'Task 1 Updated',
        description: 'Description 1 Updated',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
      })
    );

    // Verify that bulkDelete was called with the task that doesn't exist on server
    expect(db.tasks.bulkDelete).toHaveBeenCalledWith(['task2']);

    // Verify the result
    expect(result).toEqual({
      added: 1,
      updated: 1,
      removed: 1,
    });
  });
});
