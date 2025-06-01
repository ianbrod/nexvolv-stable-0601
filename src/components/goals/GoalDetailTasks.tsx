'use client';

import React, { useState } from 'react';
import { SimpleTaskItem } from '@/components/tasks/SimpleTaskItem';
import { GoalDetailTasksProps } from './goal-detail-types';
import { UnifiedTaskDetailView } from '@/components/tasks/UnifiedTaskDetailView';
import { TaskStatus } from '@prisma/client';
import { ParentGoalCard } from './ParentGoalCard';

/**
 * Component for displaying tasks associated with a parent goal
 */
export function GoalDetailTasks({
  goal,
  tasks,
  onEditTask,
  onDeleteTask,
  onCompletionChange,
  isTaskDeletePending,
  isTaskCompletionPending
}: GoalDetailTasksProps) {
  // State for detail view
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // Combined pending state for task operations
  const isPending = isTaskDeletePending || isTaskCompletionPending;

  // Get category color for the parent goal
  const categoryColor = goal?.category?.color;

  // Handle task click to open detail view
  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setIsDetailViewOpen(true);
  };

  // Handle task status change - this will be passed to SimpleTaskItem
  // The SimpleTaskItem component uses the useTaskStatus hook internally
  // which handles the optimistic UI updates and server communication
  const handleTaskStatusChange = (taskId: string, status: TaskStatus, updatedTask: any) => {
    try {
      // We'll directly call onCompletionChange with the appropriate boolean value
      // based on the current status, but we'll pass the full status information
      // This ensures backward compatibility while supporting the full status cycle
      const isCompleted = status === TaskStatus.COMPLETED;
      onCompletionChange(taskId, isCompleted, status);
    } catch (error) {
      console.error(`Error in handleTaskStatusChange for task ${taskId}:`, error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Parent Goal Card with Description */}
      <ParentGoalCard
        goal={goal}
        categoryColor={categoryColor}
      />

      {/* Parent Goal Tasks Section */}
      <section className="mt-4">
        <h2 className="text-xl font-semibold mb-3 flex justify-between items-center">
          <span>Parent Goal Tasks</span>
        </h2>
        <div className="space-y-2 pl-4 border-l-2 border-primary/30"
             style={categoryColor ? { borderLeftColor: `${categoryColor}50` } : {}}>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SimpleTaskItem
                key={task.id}
                task={task}
                goalName={goal.name}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task.id)}
                onClick={handleTaskClick}
                onStatusChange={handleTaskStatusChange}
              />
            ))
          ) : (
            <p className="text-muted-foreground italic py-2">No tasks for this parent goal.</p>
          )}
        </div>
      </section>

      {/* Task Detail View */}
      {selectedTask && (
        <UnifiedTaskDetailView
          task={selectedTask}
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          onEdit={onEditTask}
          mode="modal"
        />
      )}
    </div>
  );
}
