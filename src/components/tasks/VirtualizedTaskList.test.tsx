import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualizedTaskList } from './VirtualizedTaskList';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { taskHeightCache } from './TaskHeightCache';

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Store the original ResizeObserver if it exists
const originalResizeObserver = global.ResizeObserver;

// Mock the TaskResizeObserver component
vi.mock('./TaskResizeObserver', () => ({
  TaskResizeObserver: ({ children, task, onResize }: any) => {
    // Simulate a resize after rendering
    setTimeout(() => {
      if (onResize) {
        // Simulate different heights based on task name length
        const height = 90 + (task.name.length * 2);
        onResize(task.id, height);
      }
    }, 0);
    return <div data-testid={`resize-observer-${task.id}`}>{children}</div>;
  }
}));

// Mock the BatchTaskMeasurer component
vi.mock('./TaskMeasurer', () => ({
  BatchTaskMeasurer: ({ tasks, onAllMeasurementsComplete }: any) => {
    // Simulate measurement completion after rendering
    setTimeout(() => {
      if (onAllMeasurementsComplete) {
        // Pre-populate the cache with mock heights
        tasks.forEach((task: any) => {
          taskHeightCache.setHeight(task.id, 90 + (task.name.length * 2));
        });
        onAllMeasurementsComplete();
      }
    }, 0);
    return <div data-testid="batch-measurer"></div>;
  }
}));

// Mock the SimpleTaskItem component
vi.mock('./SimpleTaskItem', () => ({
  SimpleTaskItem: ({ task }: any) => (
    <div data-testid={`task-item-${task.id}`}>{task.name}</div>
  )
}));

// Mock the TaskPlaceholder component
vi.mock('./TaskPlaceholder', () => ({
  TaskPlaceholder: () => (
    <div data-testid="task-placeholder">Loading...</div>
  )
}));

// Mock the react-window components
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount, useIsScrolling }: any) => (
    <div data-testid="fixed-size-list">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} data-testid={`fixed-list-item-${index}`}>
          {children({
            index,
            style: {},
            data: itemData,
            isScrolling: useIsScrolling ? false : undefined
          })}
        </div>
      ))}
    </div>
  ),
  VariableSizeList: ({ children, itemData, itemCount, useIsScrolling }: any) => (
    <div data-testid="variable-size-list">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} data-testid={`variable-list-item-${index}`}>
          {children({
            index,
            style: {},
            data: itemData,
            isScrolling: useIsScrolling ? false : undefined
          })}
        </div>
      ))}
    </div>
  )
}));

// Sample tasks for testing
const mockTasks = [
  {
    id: '1',
    name: 'Short task',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1',
    goalId: 'goal1',
    parentTaskId: null,
    startedAt: null,
    completedAt: null,
    isRecurring: false,
    recurringPattern: null,
    tags: [],
    notes: '',
  },
  {
    id: '2',
    name: 'This is a longer task name that should result in a taller item',
    description: 'With a description too',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    dueDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user1',
    goalId: 'goal2',
    parentTaskId: null,
    startedAt: new Date(),
    completedAt: null,
    isRecurring: false,
    recurringPattern: null,
    tags: ['important'],
    notes: '',
  }
];

// Mock handlers
const mockHandlers = {
  onTaskSelect: vi.fn(),
  getGoalName: vi.fn().mockImplementation((goalId) => {
    if (goalId === 'goal1') return 'Goal 1';
    if (goalId === 'goal2') return 'Goal 2';
    return null;
  }),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onTaskClick: vi.fn()
};

describe('VirtualizedTaskList', () => {
  beforeAll(() => {
    // Mock ResizeObserver before tests
    global.ResizeObserver = MockResizeObserver;
  });

  afterAll(() => {
    // Restore original ResizeObserver after tests
    global.ResizeObserver = originalResizeObserver;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    taskHeightCache.clearAll();
  });

  it('renders a fixed size list when useVariableHeights is false', () => {
    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        isSelectMode={false}
        selectedTasks={new Set()}
        onTaskSelect={mockHandlers.onTaskSelect}
        getGoalName={mockHandlers.getGoalName}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTaskClick={mockHandlers.onTaskClick}
        useVariableHeights={false}
      />
    );

    expect(screen.getByTestId('fixed-size-list')).toBeInTheDocument();
    expect(screen.queryByTestId('variable-size-list')).not.toBeInTheDocument();
  });

  it('renders a variable size list when useVariableHeights is true', () => {
    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        isSelectMode={false}
        selectedTasks={new Set()}
        onTaskSelect={mockHandlers.onTaskSelect}
        getGoalName={mockHandlers.getGoalName}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTaskClick={mockHandlers.onTaskClick}
        useVariableHeights={true}
      />
    );

    expect(screen.getByTestId('variable-size-list')).toBeInTheDocument();
    expect(screen.queryByTestId('fixed-size-list')).not.toBeInTheDocument();
  });

  it('renders the batch measurer when measurements are not complete', () => {
    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        isSelectMode={false}
        selectedTasks={new Set()}
        onTaskSelect={mockHandlers.onTaskSelect}
        getGoalName={mockHandlers.getGoalName}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTaskClick={mockHandlers.onTaskClick}
        useVariableHeights={true}
      />
    );

    expect(screen.getByTestId('batch-measurer')).toBeInTheDocument();
  });

  it('renders all tasks in the list', () => {
    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        isSelectMode={false}
        selectedTasks={new Set()}
        onTaskSelect={mockHandlers.onTaskSelect}
        getGoalName={mockHandlers.getGoalName}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTaskClick={mockHandlers.onTaskClick}
      />
    );

    expect(screen.getByText('Short task')).toBeInTheDocument();
    expect(screen.getByText('This is a longer task name that should result in a taller item')).toBeInTheDocument();
  });

  it('uses the task height cache for variable height items', async () => {
    // Pre-populate the cache with mock heights
    taskHeightCache.setHeight('1', 100);
    taskHeightCache.setHeight('2', 150);

    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        isSelectMode={false}
        selectedTasks={new Set()}
        onTaskSelect={mockHandlers.onTaskSelect}
        getGoalName={mockHandlers.getGoalName}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTaskClick={mockHandlers.onTaskClick}
        useVariableHeights={true}
      />
    );

    // Wait for the resize observers to update the cache
    await waitFor(() => {
      // The mock resize observer should update the cache with new heights
      const height1 = taskHeightCache.getHeight('1');
      const height2 = taskHeightCache.getHeight('2');

      // The heights should be based on the task name length (from our mock)
      expect(height1).toBe(90 + ('Short task'.length * 2));
      expect(height2).toBe(90 + ('This is a longer task name that should result in a taller item'.length * 2));
    });
  });

  it('supports scrolling placeholders when useScrollingPlaceholder is true', () => {
    // Create a custom mock for react-window that simulates scrolling
    const customMock = vi.fn().mockImplementation(({ index, style, isScrolling, data }) => {
      if (isScrolling && data.useScrollingPlaceholder) {
        return <div data-testid="scrolling-placeholder">Placeholder</div>;
      }
      return (
        <div data-testid={`task-row-${index}`}>
          Regular task content
        </div>
      );
    });

    // Render with scrolling simulation
    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        isSelectMode={false}
        selectedTasks={new Set()}
        onTaskSelect={mockHandlers.onTaskSelect}
        getGoalName={mockHandlers.getGoalName}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTaskClick={mockHandlers.onTaskClick}
        useScrollingPlaceholder={true}
      />
    );

    // The test is primarily checking that the component renders without errors
    // when useScrollingPlaceholder is true
    expect(screen.getByTestId('variable-size-list')).toBeInTheDocument();
  });
});
