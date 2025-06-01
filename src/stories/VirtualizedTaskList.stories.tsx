import React from 'react';
import { VirtualizedTaskList } from '../components/tasks/VirtualizedTaskList';
import { Task, TaskStatus, TaskPriority } from '@prisma/client';

// This is a mock story file to demonstrate how the VirtualizedTaskList component would be used in Storybook
// In a real Storybook setup, this would be properly configured with the Storybook API

// Mock data for the stories
const mockTasks: Task[] = [
  {
    id: '1',
    name: 'Complete project documentation',
    description: 'Write comprehensive documentation for the project',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: new Date(2025, 5, 15),
    createdAt: new Date(2025, 5, 1),
    updatedAt: new Date(2025, 5, 1),
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
    name: 'Review pull requests',
    description: 'Review and approve pending pull requests',
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(2025, 5, 10),
    createdAt: new Date(2025, 5, 2),
    updatedAt: new Date(2025, 5, 3),
    userId: 'user1',
    goalId: 'goal2',
    parentTaskId: null,
    startedAt: new Date(2025, 5, 3),
    completedAt: null,
    isRecurring: false,
    recurringPattern: null,
    tags: ['code-review'],
    notes: '',
  },
  {
    id: '3',
    name: 'Fix bug in login form',
    description: 'Address the validation issue in the login form',
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    dueDate: new Date(2025, 5, 5),
    createdAt: new Date(2025, 5, 1),
    updatedAt: new Date(2025, 5, 4),
    userId: 'user1',
    goalId: 'goal1',
    parentTaskId: null,
    startedAt: new Date(2025, 5, 3),
    completedAt: new Date(2025, 5, 4),
    isRecurring: false,
    recurringPattern: null,
    tags: ['bug-fix', 'frontend'],
    notes: '',
  },
  {
    id: '4',
    name: 'Update dependencies',
    description: 'Update all project dependencies to the latest versions',
    status: TaskStatus.TODO,
    priority: TaskPriority.LOW,
    dueDate: new Date(2025, 5, 20),
    createdAt: new Date(2025, 5, 2),
    updatedAt: new Date(2025, 5, 2),
    userId: 'user1',
    goalId: 'goal3',
    parentTaskId: null,
    startedAt: null,
    completedAt: null,
    isRecurring: false,
    recurringPattern: null,
    tags: ['maintenance'],
    notes: '',
  },
  {
    id: '5',
    name: 'Implement new feature',
    description: 'Add the new feature requested by the client',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(2025, 5, 25),
    createdAt: new Date(2025, 5, 3),
    updatedAt: new Date(2025, 5, 3),
    userId: 'user1',
    goalId: 'goal2',
    parentTaskId: null,
    startedAt: null,
    completedAt: null,
    isRecurring: false,
    recurringPattern: null,
    tags: ['feature', 'client-request'],
    notes: '',
  },
];

// Mock functions for the stories
const mockHandlers = {
  onTaskSelect: (taskId: string, isSelected: boolean) => {
    console.log(`Task ${taskId} selected: ${isSelected}`);
  },
  getGoalName: (goalId: string | null) => {
    const goalNames: Record<string, string> = {
      'goal1': 'Project Alpha',
      'goal2': 'Project Beta',
      'goal3': 'Maintenance',
    };
    return goalId ? goalNames[goalId] || 'Unknown Goal' : null;
  },
  onEdit: (task: Task) => {
    console.log('Edit task:', task);
  },
  onDelete: (taskId: string) => {
    console.log('Delete task:', taskId);
  },
  onTaskClick: (task: Task) => {
    console.log('Task clicked:', task);
  },
};

// Story metadata
export default {
  title: 'Components/Tasks/VirtualizedTaskList',
  component: VirtualizedTaskList,
  parameters: {
    layout: 'centered',
  },
};

// Basic story with default settings
export const Default = () => (
  <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
    <VirtualizedTaskList
      tasks={mockTasks}
      isSelectMode={false}
      selectedTasks={new Set()}
      onTaskSelect={mockHandlers.onTaskSelect}
      getGoalName={mockHandlers.getGoalName}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
      onTaskClick={mockHandlers.onTaskClick}
      height={500}
    />
  </div>
);

// Story with selection mode enabled
export const WithSelectionMode = () => (
  <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
    <VirtualizedTaskList
      tasks={mockTasks}
      isSelectMode={true}
      selectedTasks={new Set(['1', '3'])}
      onTaskSelect={mockHandlers.onTaskSelect}
      getGoalName={mockHandlers.getGoalName}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
      onTaskClick={mockHandlers.onTaskClick}
      height={500}
    />
  </div>
);

// Story with custom item size
export const CustomItemSize = () => (
  <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
    <VirtualizedTaskList
      tasks={mockTasks}
      isSelectMode={false}
      selectedTasks={new Set()}
      onTaskSelect={mockHandlers.onTaskSelect}
      getGoalName={mockHandlers.getGoalName}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
      onTaskClick={mockHandlers.onTaskClick}
      height={500}
      itemSize={120} // Larger item size
    />
  </div>
);

// Story with few items (to demonstrate height adjustment)
export const FewItems = () => (
  <div style={{ width: '800px', height: '600px', border: '1px solid #ccc' }}>
    <VirtualizedTaskList
      tasks={mockTasks.slice(0, 2)}
      isSelectMode={false}
      selectedTasks={new Set()}
      onTaskSelect={mockHandlers.onTaskSelect}
      getGoalName={mockHandlers.getGoalName}
      onEdit={mockHandlers.onEdit}
      onDelete={mockHandlers.onDelete}
      onTaskClick={mockHandlers.onTaskClick}
      height={500}
    />
  </div>
);
