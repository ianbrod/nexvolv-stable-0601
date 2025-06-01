'use client';

import React, { useState } from 'react';
import { TaskStatus } from '@prisma/client';

// UI Components
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { GoalModal } from './GoalModal';

// Custom Components
import { GoalDetailHeader } from './GoalDetailHeader';
import { GoalDetailInfo } from './GoalDetailInfo';
import { GoalDetailSubGoals } from './GoalDetailSubGoals';
import { ExpandableGoalTasks } from './ExpandableGoalTasks';
import { UnifiedGoalDetailView } from './UnifiedGoalDetailView';
import { UnifiedTaskDetailView } from '@/components/tasks/UnifiedTaskDetailView';
import { GoalDetailsInput } from './GoalDetailsInput';
import { cn } from '@/lib/utils';

// Types
import { GoalDetailData, SubGoalForDisplay, CategoryData, GoalSelectItem } from './goal-detail-types';

interface GoalDetailViewProps {
  // Data
  goal: GoalDetailData;
  categories: CategoryData[];
  allGoals: GoalSelectItem[];
  subGoalsForDisplay: SubGoalForDisplay[];
  parentGoalTasks: any[];
  subGoalTasks: Record<string, any[]>;

  // State
  isEditModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  isSubGoalModalOpen: boolean;
  isPending: boolean;
  isTaskDeletePending: boolean;
  isTaskCompletionPending: boolean;

  // Actions
  setIsEditModalOpen: (open: boolean) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  setIsSubGoalModalOpen: (open: boolean) => void;
  handleEditGoal: () => void;
  handleDeleteGoal: () => void;
  handleDeleteTask: (taskId: string) => void;
  handleTaskCompletionChange: (taskId: string, status: TaskStatus) => void;
  handleEditTaskClick: (taskId: string) => void;
}

export const GoalDetailView = React.memo(function GoalDetailView({
  // Data
  goal,
  categories,
  allGoals,
  subGoalsForDisplay,
  parentGoalTasks,
  subGoalTasks,

  // State
  isEditModalOpen,
  isDeleteDialogOpen,
  isSubGoalModalOpen,
  isPending,
  isTaskDeletePending,
  isTaskCompletionPending,

  // Actions
  setIsEditModalOpen,
  setIsDeleteDialogOpen,
  setIsSubGoalModalOpen,
  handleEditGoal,
  handleDeleteGoal,
  handleDeleteTask,
  handleTaskCompletionChange,
  handleEditTaskClick,
}: GoalDetailViewProps) {
  // State for subgoal selection and detail panel
  const [selectedSubGoal, setSelectedSubGoal] = useState<SubGoalForDisplay | null>(null);
  const [selectedSubGoalId, setSelectedSubGoalId] = useState<string | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // State for task selection and detail panel
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskGoalName, setSelectedTaskGoalName] = useState<string | null>(null);
  const [selectedTaskCategory, setSelectedTaskCategory] = useState<any>(null);
  const [isTaskDetailPanelOpen, setIsTaskDetailPanelOpen] = useState(false);

  // Handle subgoal selection
  const handleSubGoalClick = (subGoal: SubGoalForDisplay) => {
    if (selectedSubGoalId === subGoal.id) {
      // Clicking the same subgoal closes the panel
      handleCloseDetailPanel();
    } else {
      // Clicking a different subgoal opens/switches the panel
      // First close any open task panel
      if (isTaskDetailPanelOpen) {
        handleCloseTaskDetailPanel();
      }
      setSelectedSubGoal(subGoal);
      setSelectedSubGoalId(subGoal.id);
      setIsDetailPanelOpen(true);
    }
  };

  // Handle closing the detail panel
  const handleCloseDetailPanel = () => {
    setSelectedSubGoal(null);
    setSelectedSubGoalId(null);
    setIsDetailPanelOpen(false);
  };

  // Handle edit subgoal
  const handleEditSubGoal = (subGoal: SubGoalForDisplay) => {
    // For now, just log - you can implement subgoal editing later
    console.log('Edit subgoal:', subGoal);
  };

  // Handle task selection
  const handleTaskClick = (task: any, goalName?: string, category?: any) => {
    if (selectedTaskId === task.id) {
      // Clicking the same task closes the panel
      handleCloseTaskDetailPanel();
    } else {
      // Clicking a different task opens/switches the panel
      // Create enhanced task with correct goal and category information
      const enhancedTask = {
        ...task,
        goal: {
          ...task.goal,
          name: goalName || task.goal?.name || goal.name,
          category: category || task.goal?.category || goal.category
        }
      };

      setSelectedTask(enhancedTask);
      setSelectedTaskId(task.id);
      setSelectedTaskGoalName(goalName || task.goal?.name || goal.name);
      setSelectedTaskCategory(category || task.goal?.category || goal.category);
      setIsTaskDetailPanelOpen(true);
      // Close subgoal panel if open
      if (isDetailPanelOpen) {
        handleCloseDetailPanel();
      }
    }
  };

  // Handle closing the task detail panel
  const handleCloseTaskDetailPanel = () => {
    setSelectedTask(null);
    setSelectedTaskId(null);
    setSelectedTaskGoalName(null);
    setSelectedTaskCategory(null);
    setIsTaskDetailPanelOpen(false);
  };

  // Handle edit task (wrapper to maintain compatibility)
  const handleEditTaskWrapper = (task: any) => {
    handleEditTaskClick(task.id);
  };

  // Handle task status change (wrapper to match expected signature)
  const handleTaskStatusChangeWrapper = (taskId: string, status: TaskStatus, updatedTask: any) => {
    // The useTaskStatus hook passes (taskId, status, updatedTask), so we use the status directly
    handleTaskCompletionChange(taskId, status);
  };
  return (
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <div className="w-full px-6 py-4 flex flex-col h-[calc(100vh-4rem)]">
        {/* Fixed Header Section */}
        <div className="flex-shrink-0">
          <GoalDetailHeader
            goal={goal}
            onEdit={handleEditGoal}
            isPending={isPending}
          />
        </div>

        {/* Fixed Top Section - Split Layout */}
        <div className="flex-shrink-0 flex gap-4 mb-4">
          {/* Progress History - Half Width */}
          <div className="w-1/2">
            <GoalDetailInfo goal={goal} />
          </div>

          {/* Details Input - Half Width */}
          <div className="w-1/2">
            <GoalDetailsInput goal={goal} />
          </div>
        </div>

        {/* Scrollable Content with Split Layout */}
        <div className="flex-grow flex overflow-hidden mt-4">
          {/* Main content - takes full width when no panel selected, half when panel selected */}
          <div className={cn(
            "transition-all duration-300 ease-in-out overflow-y-auto",
            (isDetailPanelOpen || isTaskDetailPanelOpen) ? "w-1/2 pr-2" : "w-full"
          )}>
            {/* Parent Goal with Tasks */}
            <div className="mb-6">
              <ExpandableGoalTasks
                goal={goal}
                tasks={parentGoalTasks}
                onEditTask={handleEditTaskWrapper}
                onDeleteTask={handleDeleteTask}
                onTaskStatusChange={handleTaskCompletionChange}
                isPending={isTaskDeletePending || isTaskCompletionPending}
                isParentGoal={true}
                onTaskClick={handleTaskClick}
                selectedTaskId={selectedTaskId}
              />
            </div>

            {/* Sub-Goals Section with their tasks */}
            <GoalDetailSubGoals
              subGoals={subGoalsForDisplay}
              subGoalTasks={subGoalTasks}
              onEditTask={handleEditTaskWrapper}
              onDeleteTask={handleDeleteTask}
              onTaskStatusChange={handleTaskStatusChangeWrapper}
              isTaskDeletePending={isTaskDeletePending}
              isTaskCompletionPending={isTaskCompletionPending}
              onSubGoalClick={handleSubGoalClick}
              selectedSubGoalId={selectedSubGoalId}
              onTaskClick={handleTaskClick}
              selectedTaskId={selectedTaskId}
            />
          </div>

          {/* Subgoal Detail Panel - only visible when a subgoal is selected */}
          {isDetailPanelOpen && selectedSubGoal && (
            <div className="w-1/2 pl-4 transition-all duration-300 ease-in-out">
              <UnifiedGoalDetailView
                goal={selectedSubGoal}
                isOpen={isDetailPanelOpen}
                onOpenChange={(open: boolean) => {
                  if (!open) handleCloseDetailPanel();
                }}
                onEdit={handleEditSubGoal}
                mode="panel"
              />
            </div>
          )}

          {/* Task Detail Panel - only visible when a task is selected */}
          {isTaskDetailPanelOpen && selectedTask && (
            <div className="w-1/2 pl-4 transition-all duration-300 ease-in-out">
              <UnifiedTaskDetailView
                task={selectedTask}
                goalName={selectedTaskGoalName || selectedTask.goal?.name || goal.name}
                isOpen={isTaskDetailPanelOpen}
                onOpenChange={(open: boolean) => {
                  if (!open) handleCloseTaskDetailPanel();
                }}
                onEdit={handleEditTaskWrapper}
                mode="panel"
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit Goal Modal */}
      <GoalModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        goalToEdit={goal}
        categories={categories}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the goal
            and all of its associated tasks and sub-goals.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteGoal}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
