'use client';

import React, { useState } from 'react';
import { Task, TaskStatus } from '@prisma/client';
import { ParentGoalCard } from './ParentGoalCard';
import { SimpleTaskItem } from '@/components/tasks/SimpleTaskItem';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UnifiedTaskDetailView } from '@/components/tasks/UnifiedTaskDetailView';
import { GoalDetailData } from './goal-detail-types';

interface ExpandableGoalTasksProps {
  goal: GoalDetailData;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus, updatedTask: Task) => void;
  isPending: boolean;
  isParentGoal?: boolean;
  onTaskClick?: (task: Task, goalName?: string, category?: any) => void;
  selectedTaskId?: string | null;
}

/**
 * Component for displaying a goal with its associated tasks in an expandable format
 */
export function ExpandableGoalTasks({
  goal,
  tasks,
  onEditTask,
  onDeleteTask,
  onTaskStatusChange,
  isPending,
  isParentGoal = false,
  onTaskClick,
  selectedTaskId
}: ExpandableGoalTasksProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // Toggle expansion state
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Get category color for visual consistency
  const getCategoryColor = (): string | undefined => {
    return goal.category?.color;
  };

  // Handle task click for detail view
  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task, goal.name, goal.category);
    } else {
      // Fallback to internal modal if no external handler
      setSelectedTask(task);
      setIsDetailViewOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      {/* Goal card with toggle inside */}
      <div className="relative ml-0">
        <ParentGoalCard
          goal={goal}
          categoryColor={getCategoryColor()}
          showProgressBar={!isParentGoal} // Only show progress bar for non-parent goals
          size="large" // Make goal cards larger
          expandControl={
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6 absolute top-2 left-2 z-10"
              onClick={toggleExpand}
              aria-label={isExpanded ? "Collapse goal" : "Expand goal"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          }
        />
      </div>

      {/* Tasks for this goal */}
      {isExpanded && tasks.length > 0 && (
        <div
          className={cn(
            "pl-6 ml-3 space-y-2 border-l-2 border-dashed",
            getCategoryColor() ? "" : "border-primary/30"
          )}
          style={getCategoryColor() ? { borderLeftColor: `${getCategoryColor()}50` } : {}}
        >
          {tasks.map(task => (
            <div
              key={task.id}
              className={cn(
                "transition-all duration-200",
                selectedTaskId === task.id && "ring-1 ring-purple-500/40 rounded-md shadow-lg shadow-purple-500/20"
              )}
            >
              <SimpleTaskItem
                task={task}
                goalName={goal.name}
                onEdit={() => onEditTask(task)}
                onDelete={() => onDeleteTask(task.id)}
                onClick={() => handleTaskClick(task)}
                onStatusChange={onTaskStatusChange}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty state for no tasks */}
      {isExpanded && tasks.length === 0 && (
        <div className="pl-6 ml-3 py-2 text-sm text-muted-foreground">
          No tasks for this goal.
        </div>
      )}

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
