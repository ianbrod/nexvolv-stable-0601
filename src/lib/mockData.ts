import { Goal, Category } from '@/types';

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Personal Growth', color: '#3b82f6' }, // blue
  { id: 'cat-2', name: 'Career Development', color: '#10b981' }, // green
  { id: 'cat-3', name: 'Health & Fitness', color: '#ef4444' }, // red
];

export const mockGoals: Goal[] = [
  {
    id: 'goal-1',
    title: 'Learn Advanced TypeScript',
    description: 'Complete a comprehensive course and build a project using advanced TS features.',
    category: 'Career Development',
    status: 'Active',
    createdAt: new Date(2024, 0, 15),
    targetCompletionDate: new Date(2024, 5, 30),
  },
  {
    id: 'goal-2',
    title: 'Read 12 Books This Year',
    category: 'Personal Growth',
    status: 'Active',
    createdAt: new Date(2024, 0, 1),
  },
  {
    id: 'subgoal-2-1',
    parentGoalId: 'goal-2',
    title: 'Read Book 1: Atomic Habits',
    category: 'Personal Growth',
    status: 'Completed',
    createdAt: new Date(2024, 0, 5),
    actualCompletionDate: new Date(2024, 0, 25),
  },
  {
    id: 'subgoal-2-2',
    parentGoalId: 'goal-2',
    title: 'Read Book 2: Deep Work',
    category: 'Personal Growth',
    status: 'Active',
    createdAt: new Date(2024, 1, 1),
  },
  {
    id: 'goal-3',
    title: 'Run a 5K Race',
    category: 'Health & Fitness',
    status: 'Active',
    createdAt: new Date(2024, 2, 1),
    targetCompletionDate: new Date(2024, 4, 15),
  },
  {
    id: 'goal-4',
    title: 'Develop Public Speaking Skills',
    description: 'Join Toastmasters and deliver 3 speeches.',
    category: 'Career Development',
    status: 'Archived',
    createdAt: new Date(2023, 8, 1),
  },
]; 