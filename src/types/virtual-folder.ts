/**
 * Virtual Folder Types
 * Type definitions for the new Prisma-based virtual folder system
 */

/**
 * Interface for virtual folder in the folder tree
 * This represents the UI structure built from Prisma entities
 */
export interface VirtualFolder {
  id: string;                    // Unique identifier for the virtual folder
  name: string;                  // Display name
  type: 'category' | 'goal' | 'subgoal' | 'custom'; // Folder type
  sourceId: string;              // Prisma entity ID (Category, Goal, SubGoal, or CustomFolder)
  children: VirtualFolder[];     // Child folders
  entryCount?: number;           // Number of entries associated with this folder
  isExpanded?: boolean;          // UI state for folder expansion
  level: number;                 // Depth level for consistent indentation (0-based)
  order: number;                 // Order within the same level
  color?: string;                // Color for category folders (inherited by children)
}

/**
 * Interface for folder tree statistics
 */
export interface FolderTreeStats {
  totalCategories: number;
  totalGoals: number;
  totalSubGoals: number;
  maxDepth: number;
  totalFolders: number;
}

/**
 * Interface for folder selection state
 */
export interface FolderSelection {
  selectedFolderId?: string;
  selectedSourceId?: string;
  selectedType?: 'category' | 'goal' | 'subgoal' | 'custom';
  breadcrumb: VirtualFolder[];   // Path from root to selected folder
}

/**
 * Interface for folder tree events
 */
export interface FolderTreeEvent {
  type: 'select' | 'expand' | 'collapse' | 'refresh';
  folderId: string;
  folder: VirtualFolder;
  timestamp: Date;
}

/**
 * Interface for folder tree configuration
 */
export interface FolderTreeConfig {
  showEntryCounts: boolean;
  autoExpandSelected: boolean;
  rememberExpansionState: boolean;
  maxDepthToShow: number;
  sortBy: 'name' | 'order' | 'entryCount';
  sortDirection: 'asc' | 'desc';
}

/**
 * Type for folder tree rendering mode
 */
export type FolderTreeMode = 'compact' | 'detailed' | 'minimal';

/**
 * Interface for folder tree context
 */
export interface FolderTreeContext {
  folders: VirtualFolder[];
  selection: FolderSelection;
  config: FolderTreeConfig;
  mode: FolderTreeMode;
  isLoading: boolean;
  error?: string;
}
