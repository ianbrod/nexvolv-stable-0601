export interface Category {
  id: string;
  name: string;
  color?: string; // Optional for V1 simple tagging
  createdAt?: Date; // Optional for mock data
}

export interface Goal {
  id: string;
  name: string; // Changed from title to match Prisma
  description?: string | null; // Allow null to match Prisma
  category?: string; // Optional category/grouping tag/string
  // status: 'Active' | 'Completed' | 'Archived'; // Removed for now, not returned by getDashboardData
  parentGoalId?: string | null; // Added: ID of the parent goal if this is a sub-goal
  notes?: string; // Optional
  createdAt: Date;
  targetCompletionDate?: Date; // Optional
  actualCompletionDate?: Date; // Optional
  order?: number; // Added: Order field for sorting goals
  // subGoals?: SubGoal[]; // Or link SubGoals via parentGoalId
}

// Option 1: Explicit SubGoal type (if structure differs significantly)
// export interface SubGoal {
//   id: string;
//   parentGoalId: string;
//   title: string;
//   description?: string;
//   status: 'Active' | 'Completed' | 'Archived';
//   notes?: string;
//   createdAt: Date;
//   targetCompletionDate?: Date;
//   actualCompletionDate?: Date;
// }

// Option 2: Use Goal interface for SubGoals (simpler if properties are the same)
// We can identify subgoals by checking if parentGoalId exists on a Goal object.
// For now, let's assume Option 2 for simplicity unless specific SubGoal fields arise.

// Add Task interface based on PRD 6.1
export interface Task {
  id: string;
  name: string; // required (renamed from title to match Prisma schema)
  description?: string | null; // Allow null to match Prisma
  priority: 'LOW' | 'MEDIUM' | 'HIGH'; // Updated to match Prisma enum
  dueDate?: Date | null; // optional
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'; // Updated to match Prisma enum
  startedAt?: Date | null; // When task was started
  completedAt?: Date | null; // When task was completed
  recurrencePattern?: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY'; // For recurring tasks
  recurrenceEndDate?: Date | null; // Optional end date for recurring tasks
  parentTaskId?: string | null; // For recurring task instances
  lastGeneratedDate?: Date | null; // Track when recurring instances were last generated
  goalId?: string | null; // optional associated Goal ID
  tags?: string[]; // simple text list/array
  notes?: string; // optional, plain text
  createdAt: Date; // auto
  updatedAt?: Date; // auto on update
  // Add optional nested goal and category for when data is included
  goal?: (Goal & {
    category?: Category | null;
  }) | null;
}



export interface Reminder {
  id: string;
  title: string;
  description?: string | null;
  dueDate: Date;
  isRecurring: boolean;
  recurrence?: string | null;
  categoryId?: string | null;
  goalId?: string | null;
  taskId?: string | null;
  userId: string;
  isCompleted: boolean;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Include related entities
  category?: Category | null;
  goal?: Goal | null;
}

export interface TranscriptSegment {
  index?: number;
  startTime?: number; // in seconds
  endTime?: number; // in seconds
  start?: number; // alternative naming for startTime
  end?: number; // alternative naming for endTime
  text: string;
}

export interface LogEntry {
  id: string;
  title: string;
  audioUrl: string;
  transcription: string;
  summary?: string;
  notes?: string; // User notes section for personal annotations
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
  isFavorite: boolean;
  // Single folder association (enforces single-folder UX)
  folderId?: string; // Single folder ID - can be category, goal, or subgoal ID with prefix
  folderType?: 'category' | 'goal' | 'subgoal' | 'custom'; // Type of folder for proper handling
  // Deprecated fields (kept for migration)
  categoryIds?: string[]; // Deprecated: Array of Prisma Category IDs
  goalIds?: string[]; // Deprecated: Array of Prisma Goal IDs
  subGoalIds?: string[]; // Deprecated: Array of Prisma SubGoal IDs
  tags?: string[]; // Deprecated: Array of tag IDs
  segments?: TranscriptSegment[]; // SRT segments with timestamps
  srtData?: string; // Raw SRT data
  processingStatus?: 'idle' | 'converting' | 'creating' | 'transcribing' | 'complete' | 'error';
  processingProgress?: number; // 0-100
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string | null;
  filterData: string; // JSON string containing filter configuration
  isDefault: boolean;
  isShared: boolean;
  userId: string;
  type?: 'task' | 'captains-log'; // Add type to distinguish filter types
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFilterOptions {
  status?: ('TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED')[];
  priority?: ('LOW' | 'MEDIUM' | 'HIGH')[];
  dueDate?: {
    from?: Date;
    to?: Date;
    includeWithoutDueDate?: boolean;
  };
  goalId?: string | null;
  searchTerm?: string;
}

// Captain's Log specific filter options
export interface CaptainsLogFilterOptions {
  activeFilter: string;
  selectedFilters: string[];
  isMultiSelectMode: boolean;
  searchQuery: string;
  startDate: Date | null;
  endDate: Date | null;
  showDateFilter: boolean;
}