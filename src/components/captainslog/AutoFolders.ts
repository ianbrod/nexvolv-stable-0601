import { Category, Goal } from '@/types';

// Interface for folder structure
export interface Folder {
  id: string;
  name: string;
  color?: string;
  isSystem?: boolean; // Flag to indicate if this is a system folder (category or goal)
  parentId?: string; // For goal folders, this will be the category ID
}

// Prefix for system folders to distinguish them
const CATEGORY_PREFIX = 'cat-folder-';
const GOAL_PREFIX = 'goal-folder-';

/**
 * Generate system folders from categories and goals
 *
 * @param categories List of categories
 * @param goals List of goals
 * @returns Array of system folders
 */
export function generateSystemFolders(categories: Category[], goals: Goal[]): Folder[] {
  const systemFolders: Folder[] = [];

  // Create folders for categories
  categories.forEach(category => {
    systemFolders.push({
      id: `${CATEGORY_PREFIX}${category.id}`,
      name: category.name,
      color: category.color || '#808080', // Default gray if no color specified
      isSystem: true
    });
  });

  // Create virtual folders for goals to use in the move dropdown only
  // We don't add these to the main systemFolders array to avoid duplicating them in the left panel
  // Instead, they'll only be used in the dropdown menu for moving records

  return systemFolders;
}

/**
 * Merge system folders with user-created folders
 * System folders will be placed at the beginning
 *
 * @param systemFolders Folders generated from categories and goals
 * @param userFolders User-created folders
 * @returns Combined array of folders
 */
export function mergeFolders(systemFolders: Folder[], userFolders: Folder[]): Folder[] {
  // Filter out any user folders that have the same ID as system folders
  const filteredUserFolders = userFolders.filter(
    userFolder => !systemFolders.some(sysFolder => sysFolder.id === userFolder.id)
  );

  // Return combined array with system folders first
  return [...systemFolders, ...filteredUserFolders];
}

/**
 * Check if a folder is a system folder
 *
 * @param folderId Folder ID to check
 * @returns Boolean indicating if it's a system folder
 */
export function isSystemFolder(folderId: string): boolean {
  return folderId.startsWith(CATEGORY_PREFIX) || folderId.startsWith(GOAL_PREFIX) || folderId.startsWith('goal:');
}

/**
 * Get the original category or goal ID from a system folder ID
 *
 * @param folderId System folder ID
 * @returns Original category or goal ID
 */
export function getOriginalId(folderId: string): string | null {
  if (folderId.startsWith(CATEGORY_PREFIX)) {
    return folderId.replace(CATEGORY_PREFIX, '');
  }

  if (folderId.startsWith(GOAL_PREFIX)) {
    return folderId.replace(GOAL_PREFIX, '');
  }

  if (folderId.startsWith('goal:')) {
    return folderId.replace('goal:', '');
  }

  return null;
}
