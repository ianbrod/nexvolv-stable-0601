/**
 * DEPRECATED: Tag-based data model for Captain's Log
 * This file contains deprecated tag functionality kept for migration purposes only.
 * New implementation uses direct Prisma entity associations.
 */

/**
 * @deprecated Use Prisma Category, Goal, SubGoal entities instead
 * Enum for tag types
 */
export enum TagType {
  CATEGORY = 'category',
  GOAL = 'goal',
  SUB_GOAL = 'sub-goal',
  USER = 'user'
}

/**
 * @deprecated Use Prisma Category, Goal, SubGoal entities instead
 * Interface for Tag data
 */
export interface Tag {
  id: string;              // Unique identifier
  name: string;            // Display name
  color: string;           // Color for visual identification
  type: TagType;           // 'category', 'goal', 'sub-goal', or 'user'
  parentId?: string;       // Parent tag ID (for hierarchical relationships)
  order: number;           // For maintaining user-defined order
  isSystem: boolean;       // Whether this is a system-generated tag
  metadata?: Record<string, any>; // Additional properties
  userId?: string;         // User ID for multi-user support
}

/**
 * Constants for tag prefixes (for backward compatibility)
 */
export const TAG_PREFIXES = {
  CATEGORY: 'cat-folder-',  // Changed from 'cat-tag-' to match expected format
  GOAL: 'goal:',            // Changed from 'goal-tag-' to match expected format
  SUB_GOAL: 'sub-goal-tag-',
  USER: 'user-tag-'
};

/**
 * Helper function to create a new tag
 */
export function createTag(
  name: string,
  type: TagType,
  options: {
    color?: string,
    parentId?: string,
    order?: number,
    isSystem?: boolean,
    metadata?: Record<string, any>,
    userId?: string
  } = {}
): Tag {
  // Generate ID based on type
  let prefix = '';
  switch (type) {
    case TagType.CATEGORY:
      prefix = TAG_PREFIXES.CATEGORY;
      break;
    case TagType.GOAL:
      prefix = TAG_PREFIXES.GOAL;
      break;
    case TagType.SUB_GOAL:
      prefix = TAG_PREFIXES.SUB_GOAL;
      break;
    case TagType.USER:
      prefix = TAG_PREFIXES.USER;
      break;
  }

  const id = `${prefix}${crypto.randomUUID()}`;

  return {
    id,
    name,
    color: options.color || '#808080', // Default gray color
    type,
    parentId: options.parentId,
    order: options.order || 0,
    isSystem: options.isSystem || false,
    metadata: options.metadata,
    userId: options.userId
  };
}

/**
 * Helper function to determine if a tag is a system tag
 */
export function isSystemTag(tagId: string): boolean {
  return (
    tagId.startsWith(TAG_PREFIXES.CATEGORY) ||
    tagId.startsWith(TAG_PREFIXES.GOAL) ||
    tagId.startsWith(TAG_PREFIXES.SUB_GOAL) ||
    // Also check for old format prefixes for backward compatibility
    tagId.startsWith('cat-tag-') ||
    tagId.startsWith('goal-tag-') ||
    tagId.startsWith('goal-folder-')
  );
}

/**
 * @deprecated Helper function to get tag type from tag ID
 */
export function getTagTypeFromId(tagId: string): TagType {
  if (tagId.startsWith(TAG_PREFIXES.CATEGORY) || tagId.startsWith('cat-tag-') || tagId.startsWith('cat-folder-')) {
    return TagType.CATEGORY;
  } else if (tagId.startsWith(TAG_PREFIXES.GOAL) || tagId.startsWith('goal-tag-') || tagId.startsWith('goal-folder-')) {
    return TagType.GOAL;
  } else if (tagId.startsWith(TAG_PREFIXES.SUB_GOAL)) {
    return TagType.SUB_GOAL;
  } else {
    return TagType.USER;
  }
}

// Re-export VirtualFolder from the new types file
export { VirtualFolder } from '@/types/virtual-folder';

/**
 * NEW: Interface for association statistics
 */
export interface AssociationStats {
  totalCategories: number;
  totalGoals: number;
  totalSubGoals: number;
  entriesWithAssociations: number;
  entriesWithoutAssociations: number;
}


