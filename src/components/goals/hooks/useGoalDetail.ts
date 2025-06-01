import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TaskStatus } from '@prisma/client';

// Actions
import { deleteGoal } from '@/actions/goals';
import { deleteTask } from '@/actions/tasks';
import { finalUpdateTaskStatus } from '@/actions/finalUpdateTaskStatus';

// Types
import { GoalDetailData, SubGoalForDisplay } from '../goal-detail-types';

interface UseGoalDetailProps {
  initialGoal: GoalDetailData;
}

interface UseGoalDetailReturn {
  // Data
  goal: GoalDetailData;
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

export function useGoalDetail({ initialGoal }: UseGoalDetailProps): UseGoalDetailReturn {
  const router = useRouter();

  // State
  const [goal, setGoal] = useState<GoalDetailData>(initialGoal);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubGoalModalOpen, setIsSubGoalModalOpen] = useState(false);

  // Transitions for different operations
  const [isPending, startTransition] = useTransition();
  const [isTaskDeletePending, startTaskDeleteTransition] = useTransition();
  const [isTaskCompletionPending, startTaskCompletionTransition] = useTransition();

  // Update goal state when initialGoal changes
  useEffect(() => {
    setGoal(initialGoal);
  }, [initialGoal]);

  // Compute sub-goals for display
  const subGoalsForDisplay: SubGoalForDisplay[] = goal.subGoals?.map(subGoal => ({
    id: subGoal.id,
    name: subGoal.name,
    description: subGoal.description,
    progress: subGoal.progress,
    deadline: subGoal.deadline,
    category: subGoal.category,
    taskCount: subGoal._count?.tasks || 0,
    subGoalCount: subGoal._count?.subGoals || 0,
    completedTaskCount: subGoal._count?.tasks || 0,
    overdueTaskCount: 0,
    tasks: [],
    timeframe: subGoal.timeframe,
  })) || [];

  // Separate parent goal tasks from sub-goal tasks
  const parentGoalTasks = goal.tasks?.filter(task => !task.goalId || task.goalId === goal.id) || [];

  // Group tasks by sub-goal
  const subGoalTasks: Record<string, any[]> = {};
  goal.subGoals?.forEach(subGoal => {
    subGoalTasks[subGoal.id] = subGoal.tasks || [];
  });

  // Handlers
  const handleEditGoal = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);



  const handleDeleteGoal = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await deleteGoal(goal.id);
        if (result.success) {
          console.log("Goal deleted successfully");
          router.push('/goals');
        } else {
          const errorMessage = result.message || result.error?.message || "Failed to delete goal";
          console.error("Error deleting goal:", errorMessage);
        }
      } catch (error) {
        console.error("An unexpected error occurred:", error);
      } finally {
        setIsDeleteDialogOpen(false);
      }
    });
  }, [goal.id, router]);

  const handleDeleteTask = useCallback((taskId: string) => {
    startTaskDeleteTransition(async () => {
      try {
        const result = await deleteTask(taskId);
        if (result.success) {
          // Update local state to remove the deleted task
          setGoal(prev => ({
            ...prev,
            tasks: prev.tasks?.filter(task => task.id !== taskId) || [],
            subGoals: prev.subGoals?.map(subGoal => ({
              ...subGoal,
              tasks: subGoal.tasks?.filter(task => task.id !== taskId) || [],
            })) || [],
          }));

          console.log("Task deleted successfully");
        } else {
          console.error("Error deleting task:", result.error || result.message || "Failed to delete task");
        }
      } catch (error) {
        console.error("An unexpected error occurred:", error);
      }
    });
  }, []);

  const handleTaskCompletionChange = useCallback((taskId: string, status: TaskStatus) => {
    startTaskCompletionTransition(async () => {
      try {
        const result = await finalUpdateTaskStatus(taskId, status);
        if (result.success) {
          // Update local state
          setGoal(prev => ({
            ...prev,
            tasks: prev.tasks?.map(task =>
              task.id === taskId
                ? { ...task, status, completedAt: status === 'COMPLETED' ? new Date() : null }
                : task
            ) || [],
            subGoals: prev.subGoals?.map(subGoal => ({
              ...subGoal,
              tasks: subGoal.tasks?.map(task =>
                task.id === taskId
                  ? { ...task, status, completedAt: status === 'COMPLETED' ? new Date() : null }
                  : task
              ) || [],
            })) || [],
          }));

          console.log(`Task marked as ${status.toLowerCase()}`);
        } else {
          const errorMessage = result.message || result.error?.message || "Failed to update task";
          console.error("Error updating task:", errorMessage);
        }
      } catch (error) {
        console.error("An unexpected error occurred:", error);
      }
    });
  }, []);

  const handleEditTaskClick = useCallback((taskId: string) => {
    // Navigate to task edit page or open task edit modal
    router.push(`/tasks/${taskId}/edit`);
  }, [router]);

  return {
    // Data
    goal,
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
  };
}
