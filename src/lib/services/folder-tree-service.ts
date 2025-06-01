/**
 * Folder Tree Service
 * Generates a virtual folder tree from tags for the UI
 */

import { Tag, TagType, isSystemTag, getTagTypeFromId } from '../storage/tag-model';

/**
 * Interface for virtual folder structure
 * This maintains the folder UI while using tags as the backend
 */
export interface VirtualFolder {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
  children: VirtualFolder[];
  sourceTagId: string;  // Reference to the original tag
}

/**
 * Service for generating and managing virtual folder trees from tags
 */
export class FolderTreeService {
  private virtualFolders: VirtualFolder[] = [];
  private tagMap: Map<string, Tag> = new Map();

  /**
   * Generate a virtual folder tree from tags
   * @param tags Array of tags to convert to a folder tree
   * @returns Array of top-level virtual folders
   */
  generateFolderTree(tags: Tag[]): VirtualFolder[] {
    // Reset state
    this.virtualFolders = [];
    this.tagMap = new Map();

    // Map tags by ID for quick lookup
    tags.forEach(tag => {
      this.tagMap.set(tag.id, tag);
    });

    // Process tags to ensure they have the correct type and isSystem flag set
    // This handles legacy tags that might have been created with incorrect types
    const processedTags = tags.map(tag => {
      // Make a copy of the tag to avoid modifying the original
      let processedTag = { ...tag };

      // If the tag doesn't have a type, infer it from the ID
      if (!processedTag.type) {
        processedTag.type = getTagTypeFromId(processedTag.id);
      }

      // Ensure isSystem is set correctly based on the ID
      processedTag.isSystem = isSystemTag(processedTag.id);

      // Log processed tag for debugging
      console.log(`Processed tag: ${processedTag.name} (${processedTag.id}), Type: ${processedTag.type}, System: ${processedTag.isSystem}`);

      return processedTag;
    });

    // First, find all category tags (top level)
    const categoryTags = processedTags.filter(tag =>
      tag.type === TagType.CATEGORY ||
      tag.id.startsWith('cat-folder-') ||
      tag.id.startsWith('cat-tag-')
    );

    // Create virtual folders for categories
    const categoryFolders = categoryTags.map(tag => this.createVirtualFolder(tag));

    // Find all goal tags
    const goalTags = processedTags.filter(tag =>
      tag.type === TagType.GOAL ||
      tag.id.startsWith('goal:') ||
      tag.id.startsWith('goal-tag-') ||
      tag.id.startsWith('goal-folder-')
    );

    // Add goals to their parent categories
    for (const goalTag of goalTags) {
      if (goalTag.parentId) {
        // Find the parent category folder
        const parentFolder = this.findFolderBySourceTagId(categoryFolders, goalTag.parentId);

        if (parentFolder) {
          // Create a virtual folder for the goal and add it as a child
          const goalFolder = this.createVirtualFolder(goalTag);
          parentFolder.children.push(goalFolder);
        } else {
          // If parent not found, add as top-level folder
          console.warn(`Parent folder not found for goal ${goalTag.id} (${goalTag.name}), adding as top-level`);
          categoryFolders.push(this.createVirtualFolder(goalTag));
        }
      } else {
        // If no parent ID, try to find a matching category by name pattern
        // This is for backward compatibility with old goal format
        let parentFound = false;

        for (const categoryFolder of categoryFolders) {
          const categoryTag = this.tagMap.get(categoryFolder.sourceTagId);
          if (categoryTag && goalTag.name.includes(categoryTag.name)) {
            // Create a virtual folder for the goal and add it as a child
            const goalFolder = this.createVirtualFolder(goalTag);
            categoryFolder.children.push(goalFolder);
            parentFound = true;
            break;
          }
        }

        // If no parent found, add as top-level folder
        if (!parentFound) {
          categoryFolders.push(this.createVirtualFolder(goalTag));
        }
      }
    }

    // Find all sub-goal tags
    const subGoalTags = processedTags.filter(tag =>
      tag.type === TagType.SUB_GOAL ||
      tag.id.startsWith('sub-goal-tag-')
    );

    // Add sub-goals to their parent goals
    for (const subGoalTag of subGoalTags) {
      if (subGoalTag.parentId) {
        // Find the parent goal folder by traversing the tree
        let parentFound = false;

        for (const categoryFolder of categoryFolders) {
          const parentGoalFolder = this.findFolderBySourceTagId(categoryFolder.children, subGoalTag.parentId);

          if (parentGoalFolder) {
            // Create a virtual folder for the sub-goal and add it as a child
            const subGoalFolder = this.createVirtualFolder(subGoalTag);
            parentGoalFolder.children.push(subGoalFolder);
            parentFound = true;
            break;
          }
        }

        // If parent not found, add as top-level folder
        if (!parentFound) {
          categoryFolders.push(this.createVirtualFolder(subGoalTag));
        }
      } else {
        // If no parent ID, add as top-level folder
        categoryFolders.push(this.createVirtualFolder(subGoalTag));
      }
    }

    // Find all user tags (these will be top-level user folders)
    const userTags = processedTags.filter(tag =>
      tag.type === TagType.USER ||
      tag.id.startsWith('user-tag-')
    );

    // Create virtual folders for user tags
    const userFolders = userTags.map(tag => this.createVirtualFolder(tag));

    // Combine all top-level folders
    this.virtualFolders = [...categoryFolders, ...userFolders];

    // Sort folders: system folders first, then user folders, both alphabetically
    this.virtualFolders.sort((a, b) => {
      // System folders come before user folders
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;

      // Within each group, sort alphabetically
      return a.name.localeCompare(b.name);
    });

    // Log the generated folder tree for debugging
    console.log(`Generated folder tree with ${this.virtualFolders.length} top-level folders`);

    // Log each top-level folder and its children
    this.virtualFolders.forEach(folder => {
      console.log(`Top-level folder: ${folder.name} (${folder.id}), System: ${folder.isSystem}, Children: ${folder.children.length}`);

      folder.children.forEach(child => {
        console.log(`  Child folder: ${child.name} (${child.id}), System: ${child.isSystem}`);
      });
    });

    return this.virtualFolders;
  }

  /**
   * Get a virtual folder by ID
   * @param folderId The ID of the folder to find
   * @returns The virtual folder or undefined if not found
   */
  getFolderById(folderId: string): VirtualFolder | undefined {
    // Search through all folders and their children
    for (const folder of this.virtualFolders) {
      const result = this.findFolderById(folder, folderId);
      if (result) {
        return result;
      }
    }

    return undefined;
  }

  /**
   * Get the tag IDs associated with a virtual folder
   * @param folderId The ID of the virtual folder
   * @returns Array of tag IDs
   */
  getTagsForFolder(folderId: string): string[] {
    // Handle special cases
    if (folderId === 'favorites' || folderId === 'recent' || folderId === 'uncategorized' || folderId === 'archive') {
      return [];
    }

    // Extract the actual folder ID from various formats
    let actualFolderId = folderId;

    // Handle 'folder:ID' format
    if (folderId.startsWith('folder:')) {
      actualFolderId = folderId.substring(7);
      console.log(`Extracted folder ID ${actualFolderId} from ${folderId}`);
    }

    const folder = this.getFolderById(actualFolderId);

    if (!folder) {
      console.warn(`Folder with ID ${actualFolderId} not found`);
      return [];
    }

    // Return the source tag ID
    return [folder.sourceTagId];
  }

  /**
   * Create a virtual folder from a tag
   * @param tag The tag to convert to a virtual folder
   * @returns A new virtual folder
   */
  private createVirtualFolder(tag: Tag): VirtualFolder {
    // Ensure isSystem is set correctly based on the tag ID
    const isSystemFolder = tag.isSystem !== undefined ? tag.isSystem : isSystemTag(tag.id);

    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      isSystem: isSystemFolder,
      children: [],
      sourceTagId: tag.id
    };
  }

  /**
   * Find a folder by its source tag ID in an array of folders
   * @param folders Array of folders to search
   * @param sourceTagId The source tag ID to find
   * @returns The found folder or undefined
   */
  private findFolderBySourceTagId(folders: VirtualFolder[], sourceTagId: string): VirtualFolder | undefined {
    for (const folder of folders) {
      if (folder.sourceTagId === sourceTagId) {
        return folder;
      }
    }

    return undefined;
  }

  /**
   * Recursively find a folder by its ID
   * @param folder The current folder to check
   * @param folderId The ID to find
   * @returns The found folder or undefined
   */
  private findFolderById(folder: VirtualFolder, folderId: string): VirtualFolder | undefined {
    if (folder.id === folderId) {
      return folder;
    }

    for (const child of folder.children) {
      const result = this.findFolderById(child, folderId);
      if (result) {
        return result;
      }
    }

    return undefined;
  }
}

// Create a singleton instance of the folder tree service
export const folderTreeService = new FolderTreeService();
