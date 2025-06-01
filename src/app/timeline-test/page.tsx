'use client';

import React from 'react';
import { ChunkedTimelineView } from '@/components/dashboard/ChunkedTimelineView';
import { MonthlyTimelineView } from '@/components/dashboard/MonthlyTimelineView';
import { Task } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Generate sample tasks with fixed seed data to avoid hydration errors
const generateSampleTasks = (): Task[] => {
  const baseDate = new Date('2023-06-15');
  const sampleTasks: Task[] = [];

  // Create 50 tasks with various dates
  for (let i = 0; i < 50; i++) {
    const dueDate = new Date(baseDate);

    // Distribute tasks across different dates
    // Some in the past, some today, some in the future
    dueDate.setDate(dueDate.getDate() - 15 + i);

    // Use deterministic priority and status based on index
    const priorities: ('LOW' | 'MEDIUM' | 'HIGH')[] = ['LOW', 'MEDIUM', 'HIGH'];
    const statuses: ('TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED')[] =
      ['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];

    const priority = priorities[i % priorities.length];
    const status = statuses[i % statuses.length];

    // Create task
    sampleTasks.push({
      id: `task-${i}`,
      name: `Task ${i}`,
      description: `This is a sample task ${i} for testing the timeline view`,
      priority,
      status,
      dueDate: i % 5 === 0 ? undefined : dueDate, // Some tasks have no due date
    });
  }

  return sampleTasks;
};

// Pre-generate tasks to avoid hydration errors
const tasks = generateSampleTasks();

export default function TimelineTestPage() {
  // Handle task click
  const handleTaskClick = (task: Task) => {
    console.log('Task clicked:', task);
    alert(`Clicked on task: ${task.name}`);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Timeline Test Page</h1>
      <p className="mb-6">
        This page demonstrates the date-based chunking functionality for timeline items.
      </p>

      <Tabs defaultValue="chunked">
        <TabsList className="mb-4">
          <TabsTrigger value="chunked">Chunked Timeline</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="chunked" className="space-y-6">
          <ChunkedTimelineView
            tasks={tasks}
            height={600}
            onTaskClick={handleTaskClick}
            title="Chunked Timeline View"
          />
        </TabsContent>

        <TabsContent value="monthly">
          <MonthlyTimelineView
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
