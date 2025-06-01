import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';

/**
 * Type definition for a goal with all its details
 */
export type GoalDetailData = Prisma.GoalGetPayload<{
  include: {
    category: true;
    tasks: true;
    subGoals: {
      include: { category: true, _count: { select: { tasks: true, subGoals: true } } }
    };
  }
}>;

/**
 * Type definition for a category
 */
export type CategoryData = Prisma.CategoryGetPayload<{}>;

/**
 * Type definition for a sub-goal prepared for display
 */
export type SubGoalForDisplay = Prisma.GoalGetPayload<{
  include: { category: true, _count: { select: { tasks: true, subGoals: true } } }
}> & {
  category: { id: string; name: string; color?: string } | null;
  tasks: []; // Added empty tasks array
  timeframe: string | null;
  subGoalCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
};

/**
 * Type definition for a goal in a selection list
 */
export type GoalSelectItem = {
  id: string;
  name: string
};

/**
 * Props for the GoalDetailClientWrapper component
 */
export interface GoalDetailProps {
  goal: GoalDetailData;
  categories: CategoryData[];
  allGoals: GoalSelectItem[];
}

/**
 * Props for the GoalDetailHeader component
 */
export interface GoalDetailHeaderProps {
  goal: GoalDetailData;
  onEdit: () => void;
  isPending: boolean;
}

/**
 * Props for the GoalDetailInfo component
 */
export interface GoalDetailInfoProps {
  goal: GoalDetailData;
}

/**
 * Props for the GoalDetailSubGoals component
 */
export interface GoalDetailSubGoalsProps {
  subGoals: SubGoalForDisplay[];
  subGoalTasks: Record<string, any[]>;
  onEditTask: (task: Prisma.TaskGetPayload<{}>) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, completed: boolean, status?: TaskStatus) => void;
  isTaskDeletePending: boolean;
  isTaskCompletionPending: boolean;
}

/**
 * Props for the GoalDetailTasks component
 */
export interface GoalDetailTasksProps {
  goal: GoalDetailData;
  tasks: Prisma.TaskGetPayload<{}>[];
  onEditTask: (task: Prisma.TaskGetPayload<{}>) => void;
  onDeleteTask: (taskId: string) => void;
  onCompletionChange: (taskId: string, completed: boolean, status?: TaskStatus) => void;
  isTaskDeletePending: boolean;
  isTaskCompletionPending: boolean;
}

/**
 * Props for task handlers
 */
export interface TaskHandlers {
  onEditTask: (task: Prisma.TaskGetPayload<{}>) => void;
  onStatusChange: (taskId: string, newStatus: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  onCompletionChange: (taskId: string, completed: boolean, status?: TaskStatus) => void;
}
