import { Prisma } from '@prisma/client';
import { GoalCardData, CategoryData } from './types';

/**
 * Props for the RenderGoalHierarchy component
 */
export interface RenderGoalHierarchyProps {
  goals: GoalCardData[];
  parentId: string | null;
  categories: CategoryData[];
  onEdit: (goal: GoalCardData) => void;
  onDelete: (id: string) => void;
  onClick: (goalId: string) => void;
  onExpandToggle: (goalId: string, e: React.MouseEvent) => void;
  expandedGoals: Set<string>;
  level: number;
}

/**
 * Props for the GoalListHeader component
 */
export interface GoalListHeaderProps {
  categories: CategoryData[];
  parentGoals?: GoalCardData[];
  onCollapseAll?: () => void;
  hasExpandedGoals?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Props for the GoalListFilters component
 */
export interface GoalListFiltersProps {
  categories: CategoryData[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

/**
 * Props for the CategoriesPanel component
 */
export interface CategoriesPanelProps {
  categories: CategoryData[];
  selectedCategoryIds: string[];
  onCategoryClick: (categoryId: string | null) => void;
  onCategoriesReordered: (newOrder: CategoryData[]) => void;
  onClearSelection: () => void;
  selectMode: boolean;
  onSelectModeToggle: () => void;
}

/**
 * Props for the GoalListWrapper component
 */
export interface GoalListWrapperProps {
  goals: GoalCardData[];
  categories: CategoryData[];
}

/**
 * Props for the GoalDetailPanelWrapper component
 */
export interface GoalDetailPanelWrapperProps {
  goal: GoalCardData | null;
  categories: CategoryData[];
  onClose: () => void;
  onAddTask: (goalId: string) => void;
  subGoals: GoalCardData[];
  width?: number;
  onResize?: (newWidth: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onResetWidth?: () => void;
  getConstrainedWidth?: (width: number) => number;
}
