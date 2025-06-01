'use client';

import React from 'react';
import { Task, Goal, TaskStatus } from '@prisma/client';
import { SimpleTaskItem } from '@/components/tasks/SimpleTaskItem';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';

interface TaskAccordionProps {
  tasks: Task[];
  goals: Goal[];
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onCompletionChange: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  isPending: boolean;
}

export function TaskAccordion({
  tasks,
  goals,
  onEdit,
  onStatusChange,
  onCompletionChange,
  onDeleteTask,
  isPending
}: TaskAccordionProps) {
  // Function to get goal name by ID
  const getGoalName = (goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.name : null;
  };

  // Group tasks by due date
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

  // Sort tasks by priority within each group
  const sortByPriority = (a: Task, b: Task) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
  };

  overdueTasks.sort(sortByPriority);
  todayTasks.sort(sortByPriority);
  tomorrowTasks.sort(sortByPriority);
  thisWeekTasks.sort(sortByPriority);
  laterTasks.sort(sortByPriority);

  // Sort completed tasks by completion date (most recent first)
  completedTasks.sort((a, b) => {
    if (!a.completedAt && !b.completedAt) return 0;
    if (!a.completedAt) return 1;
    if (!b.completedAt) return -1;
    return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
  });

  // Helper to render task items
  const renderTasks = (taskList: Task[]) => {
    return taskList.map(task => (
      <SimpleTaskItem
        key={task.id}
        task={task}
        goalName={getGoalName(task.goalId)}
        onEdit={onEdit}
        onDelete={onDeleteTask}
        onClick={() => onEdit(task)} // Use onEdit as the onClick handler to view task details
        onStatusChange={(taskId, status) => onStatusChange(taskId, status.toString())} // Pass the status change handler
      />
    ));
  };

  return (
    <Accordion type="multiple" defaultValue={overdueTasks.length > 0 ? ["overdue"] : ["today"]} className="w-full">
      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <AccordionItem value="overdue">
          <AccordionTrigger className="text-red-500 font-medium">
            Overdue
            <Badge variant="destructive" className="ml-2">{overdueTasks.length}</Badge>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {renderTasks(overdueTasks)}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <AccordionItem value="today">
          <AccordionTrigger>
            Today
            <Badge className="ml-2">{todayTasks.length}</Badge>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {renderTasks(todayTasks)}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Tomorrow's Tasks */}
      {tomorrowTasks.length > 0 && (
        <AccordionItem value="tomorrow">
          <AccordionTrigger>
            Tomorrow
            <Badge className="ml-2">{tomorrowTasks.length}</Badge>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {renderTasks(tomorrowTasks)}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* This Week's Tasks */}
      {thisWeekTasks.length > 0 && (
        <AccordionItem value="thisWeek">
          <AccordionTrigger>
            This Week
            <Badge className="ml-2">{thisWeekTasks.length}</Badge>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {renderTasks(thisWeekTasks)}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Later Tasks */}
      {laterTasks.length > 0 && (
        <AccordionItem value="later">
          <AccordionTrigger>
            Later
            <Badge className="ml-2">{laterTasks.length}</Badge>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {renderTasks(laterTasks)}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <AccordionItem value="completed">
          <AccordionTrigger>
            Completed
            <Badge variant="outline" className="ml-2">{completedTasks.length}</Badge>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              {renderTasks(completedTasks)}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
