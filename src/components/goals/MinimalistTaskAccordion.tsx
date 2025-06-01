'use client';

import React, { useState, useTransition, useCallback, useMemo } from 'react';
import { Task, Goal, TaskStatus } from '@prisma/client';
import { SimpleTaskItem } from '@/components/tasks/SimpleTaskItem';
import {
  MinimalistAccordion,
  MinimalistAccordionContent,
  MinimalistAccordionItem,
  MinimalistAccordionTrigger,
} from "./MinimalistAccordion";
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { finalUpdateTaskStatus } from '@/actions/finalUpdateTaskStatus';
import { useRouter } from 'next/navigation';

interface MinimalistTaskAccordionProps {
  tasks: Task[];
  goals: Goal[];
  onEdit: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus, updatedTasks: Task[]) => void;
  isPending: boolean;
}

const MinimalistTaskAccordionComponent = ({
  tasks,
  goals,
  onEdit,
  onDeleteTask,
  onStatusChange,
  isPending: parentIsPending
}: MinimalistTaskAccordionProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Memoize goal lookup function
  const getGoalName = useCallback((goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.name : null;
  }, [goals]);

  // Memoize task grouping by due date
  const taskGroups = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);

    const overdueTasks = tasks.filter(task =>
      task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== 'COMPLETED'
    );

    const todayTasks = tasks.filter(task =>
      task.dueDate && isToday(new Date(task.dueDate))
    );

    const tomorrowTasks = tasks.filter(task =>
      task.dueDate && isTomorrow(new Date(task.dueDate))
    );

    const thisWeekTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return !isToday(dueDate) && !isTomorrow(dueDate) && dueDate <= nextWeek && !isPast(dueDate);
    });

    const laterTasks = tasks.filter(task => {
      if (!task.dueDate) return true; // Tasks with no due date go here
      const dueDate = new Date(task.dueDate);
      return dueDate > nextWeek;
    });

    const completedTasks = tasks.filter(task =>
      task.status === 'COMPLETED'
    );

    return {
      overdueTasks,
      todayTasks,
      tomorrowTasks,
      thisWeekTasks,
      laterTasks,
      completedTasks
    };
  }, [tasks]);

  // Memoize task status change handler
  const handleTaskStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    // Start a transition to update the UI
    startTransition(async () => {
      try {
        // Call the server action to update the task status
        const result = await finalUpdateTaskStatus(taskId, status);

        if (result.success) {
          // Find the task in the tasks array and update its status
          const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
              // Create a new task object with the updated status
              return {
                ...task,
                status,
                // Update timestamps based on status
                completedAt: status === TaskStatus.COMPLETED ? new Date() :
                             status === TaskStatus.TODO ? null : task.completedAt,
                startedAt: status === TaskStatus.IN_PROGRESS && !task.startedAt ?
                           new Date() : task.startedAt
              };
            }
            return task;
          });

          // Pass the updated tasks back to the parent component
          if (typeof onStatusChange === 'function') {
            onStatusChange(taskId, status, updatedTasks);
          }
        }

        // Refresh the router to update the UI
        router.refresh();
      } catch (error) {
        console.error(`Error updating task status:`, error);
      }
    });
  }, [tasks, onStatusChange, router]);

  // Memoize task rendering function
  const renderTasks = useCallback((taskList: Task[]) => {
    return taskList.map(task => (
      <SimpleTaskItem
        key={task.id}
        task={task}
        goalName={getGoalName(task.goalId)}
        onEdit={onEdit}
        onDelete={onDeleteTask}
        onClick={() => onEdit(task)} // Use onEdit as the onClick handler to view task details
        onStatusChange={handleTaskStatusChange} // Add status change handler
      />
    ));
  }, [getGoalName, onEdit, onDeleteTask, handleTaskStatusChange]);

  // Memoize all sections calculation
  const allSections = useMemo(() => {
    const sections = [];
    if (taskGroups.overdueTasks.length > 0) sections.push("overdue");
    if (taskGroups.todayTasks.length > 0) sections.push("today");
    if (taskGroups.tomorrowTasks.length > 0) sections.push("tomorrow");
    if (taskGroups.thisWeekTasks.length > 0) sections.push("thisWeek");
    if (taskGroups.laterTasks.length > 0) sections.push("later");
    if (taskGroups.completedTasks.length > 0) sections.push("completed");
    return sections;
  }, [taskGroups]);

  return (
    <MinimalistAccordion type="multiple" defaultValue={allSections} className="w-full">
      {/* Overdue Tasks */}
      {taskGroups.overdueTasks.length > 0 && (
        <MinimalistAccordionItem value="overdue" className="border-none">
          <MinimalistAccordionTrigger className="text-red-500">
            Overdue
          </MinimalistAccordionTrigger>
          <MinimalistAccordionContent>
            <div className="space-y-2">
              {renderTasks(taskGroups.overdueTasks)}
            </div>
          </MinimalistAccordionContent>
        </MinimalistAccordionItem>
      )}

      {/* Today's Tasks */}
      {taskGroups.todayTasks.length > 0 && (
        <MinimalistAccordionItem value="today" className="border-none">
          <MinimalistAccordionTrigger>
            Today
          </MinimalistAccordionTrigger>
          <MinimalistAccordionContent>
            <div className="space-y-2">
              {renderTasks(taskGroups.todayTasks)}
            </div>
          </MinimalistAccordionContent>
        </MinimalistAccordionItem>
      )}

      {/* Tomorrow's Tasks */}
      {taskGroups.tomorrowTasks.length > 0 && (
        <MinimalistAccordionItem value="tomorrow" className="border-none">
          <MinimalistAccordionTrigger>
            Tomorrow
          </MinimalistAccordionTrigger>
          <MinimalistAccordionContent>
            <div className="space-y-2">
              {renderTasks(taskGroups.tomorrowTasks)}
            </div>
          </MinimalistAccordionContent>
        </MinimalistAccordionItem>
      )}

      {/* This Week's Tasks */}
      {taskGroups.thisWeekTasks.length > 0 && (
        <MinimalistAccordionItem value="thisWeek" className="border-none">
          <MinimalistAccordionTrigger>
            This Week
          </MinimalistAccordionTrigger>
          <MinimalistAccordionContent>
            <div className="space-y-2">
              {renderTasks(taskGroups.thisWeekTasks)}
            </div>
          </MinimalistAccordionContent>
        </MinimalistAccordionItem>
      )}

      {/* Later Tasks */}
      {taskGroups.laterTasks.length > 0 && (
        <MinimalistAccordionItem value="later" className="border-none">
          <MinimalistAccordionTrigger>
            Later
          </MinimalistAccordionTrigger>
          <MinimalistAccordionContent>
            <div className="space-y-2">
              {renderTasks(taskGroups.laterTasks)}
            </div>
          </MinimalistAccordionContent>
        </MinimalistAccordionItem>
      )}

      {/* Completed Tasks */}
      {taskGroups.completedTasks.length > 0 && (
        <MinimalistAccordionItem value="completed" className="border-none">
          <MinimalistAccordionTrigger className="text-muted-foreground">
            Completed
          </MinimalistAccordionTrigger>
          <MinimalistAccordionContent>
            <div className="space-y-2">
              {renderTasks(taskGroups.completedTasks)}
            </div>
          </MinimalistAccordionContent>
        </MinimalistAccordionItem>
      )}
    </MinimalistAccordion>
  );
};

export const MinimalistTaskAccordion = React.memo(MinimalistTaskAccordionComponent);