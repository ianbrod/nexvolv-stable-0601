import { Prisma } from '@prisma/client';

/**
 * Type definition for goal data used in GoalCard and related components
 */
export type GoalCardData = Prisma.GoalGetPayload<{
  select: {
    id: true, name: true, description: true, categoryId: true,
    deadline: true, progress: true, isArchived: true, userId: true,
    parentGoalId: true, createdAt: true, updatedAt: true, timeframe: true,
    order: true, // Include the order field
    category: { select: { id: true, name: true, color: true } },
    tasks: { select: { id: true, status: true, dueDate: true } },
    _count: { select: { subGoals: true } }
  }
}> & {
  subGoalCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
};

/**
 * Type definition for category data
 */
export type CategoryData = Prisma.CategoryGetPayload<{
  select: {
    id: true,
    name: true,
    color: true
  }
}>;

/**
 * Props for the GoalCard component
 */
export interface GoalCardProps {
  goal: GoalCardData;
  categories?: CategoryData[];
  onEdit?: (goal: GoalCardData) => void;
  onDelete?: (id: string) => void;
  isCompletedView?: boolean;
  onClick?: (goalId: string) => void;
  onExpandToggle?: (goalId: string, e: React.MouseEvent) => void;
  isExpanded?: boolean;
  hasSubGoals?: boolean;
  isSubGoal?: boolean;
  compactView?: boolean;
  isSelected?: boolean;
  useGlowingEffect?: boolean;
}
