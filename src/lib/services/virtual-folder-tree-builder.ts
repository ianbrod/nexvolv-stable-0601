/**
 * Virtual Folder Tree Builder Service
 * Builds hierarchical folder tree from Prisma entities (Categories, Goals, SubGoals)
 * Replaces the tag-based folder tree system with API-based entity references
 */

import { VirtualFolder } from '@/types/virtual-folder';

// Helper function to get user ID (matches existing pattern)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * Interface for Prisma entities used in folder tree building
 */
interface PrismaCategory {
  id: string;
  name: string;
  order: number;
  color?: string;
}

interface PrismaGoal {
  id: string;
  name: string;
  categoryId: string | null;
  parentGoalId: string | null;
  order: number;
}

interface PrismaSubGoal extends PrismaGoal {
  parentGoalId: string; // SubGoals always have a parent
}

interface PrismaCustomFolder {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service for building virtual folder trees from Prisma entities
 */
export class VirtualFolderTreeBuilder {
  private categories: PrismaCategory[] = [];
  private goals: PrismaGoal[] = [];
  private subGoals: PrismaSubGoal[] = [];
  private customFolders: PrismaCustomFolder[] = [];

  /**
   * Build a complete virtual folder tree from Prisma data
   * Implements two-phase approach: fetch data, then build hierarchy
   */
  async buildFolderTree(): Promise<VirtualFolder[]> {
    try {
      console.log('Starting virtual folder tree build...');

      // Phase 1: Fetch and organize Prisma data
      await this.fetchPrismaData();

      // Phase 2: Build hierarchical structure
      const folderTree = this.buildHierarchicalStructure();

      console.log(`Built folder tree with ${folderTree.length} top-level folders`);
      return folderTree;
    } catch (error) {
      console.error('Error building virtual folder tree:', error);
      throw error;
    }
  }

  /**
   * Phase 1: Fetch and organize Prisma data via API
   * Retrieves categories, goals, and subgoals with proper ordering
   */
  private async fetchPrismaData(): Promise<void> {
    try {
      const userId = await getUserId();

      // Fetch all data concurrently for performance via API routes
      const [categoriesResponse, goalsResponse, customFoldersResponse] = await Promise.all([
        // Fetch categories with proper ordering
        fetch(`/api/categories?userId=${userId}`),
        // Fetch all goals (both parent goals and subgoals)
        fetch(`/api/goals?userId=${userId}&includeArchived=false`),
        // Fetch custom folders
        fetch(`/api/custom-folders?userId=${userId}`)
      ]);

      if (!categoriesResponse.ok) {
        throw new Error(`Failed to fetch categories: ${categoriesResponse.statusText}`);
      }
      if (!goalsResponse.ok) {
        throw new Error(`Failed to fetch goals: ${goalsResponse.statusText}`);
      }
      if (!customFoldersResponse.ok) {
        throw new Error(`Failed to fetch custom folders: ${customFoldersResponse.statusText}`);
      }

      const categories = await categoriesResponse.json();
      const goals = await goalsResponse.json();
      const customFolders = await customFoldersResponse.json();

      // Separate goals and subgoals
      this.categories = categories;
      this.goals = goals.filter((goal: PrismaGoal) => goal.parentGoalId === null);
      this.subGoals = goals.filter((goal: PrismaGoal) => goal.parentGoalId !== null) as PrismaSubGoal[];
      this.customFolders = customFolders;

      console.log(`Fetched ${this.categories.length} categories, ${this.goals.length} goals, ${this.subGoals.length} subgoals, ${this.customFolders.length} custom folders`);
    } catch (error) {
      console.error('Error fetching Prisma data:', error);
      throw error;
    }
  }

  /**
   * Phase 2: Build hierarchical structure with proper parent-child relationships
   * Creates VirtualFolder tree with consistent depth calculation
   */
  private buildHierarchicalStructure(): VirtualFolder[] {
    const rootFolders: VirtualFolder[] = [];

    // Build category folders (level 0)
    for (const category of this.categories) {
      const categoryFolder = this.createVirtualFolder(
        category.id,
        category.name,
        'category',
        category.id,
        0, // Categories are at level 0
        category.order,
        category.color // Pass category color
      );

      // Add goals to this category (level 1)
      const categoryGoals = this.goals.filter(goal => goal.categoryId === category.id);
      for (const goal of categoryGoals) {
        const goalFolder = this.createVirtualFolder(
          goal.id,
          goal.name,
          'goal',
          goal.id,
          1, // Goals are at level 1
          goal.order,
          category.color // Inherit category color
        );

        // Add subgoals to this goal (level 2)
        const goalSubGoals = this.subGoals.filter(subGoal => subGoal.parentGoalId === goal.id);
        for (const subGoal of goalSubGoals) {
          const subGoalFolder = this.createVirtualFolder(
            subGoal.id,
            subGoal.name,
            'subgoal',
            subGoal.id,
            2, // SubGoals are at level 2
            subGoal.order,
            category.color // Inherit category color
          );

          goalFolder.children.push(subGoalFolder);
        }

        // Sort subgoals by order
        goalFolder.children.sort((a, b) => a.order - b.order);
        categoryFolder.children.push(goalFolder);
      }

      // Sort goals by order
      categoryFolder.children.sort((a, b) => a.order - b.order);
      rootFolders.push(categoryFolder);
    }

    // Handle orphaned goals (goals without a category)
    const orphanedGoals = this.goals.filter(goal => !goal.categoryId);
    for (const goal of orphanedGoals) {
      const goalFolder = this.createVirtualFolder(
        goal.id,
        goal.name,
        'goal',
        goal.id,
        0, // Orphaned goals become top-level (level 0)
        goal.order,
        '#808080' // Default gray color for orphaned goals
      );

      // Add subgoals to orphaned goals
      const goalSubGoals = this.subGoals.filter(subGoal => subGoal.parentGoalId === goal.id);
      for (const subGoal of goalSubGoals) {
        const subGoalFolder = this.createVirtualFolder(
          subGoal.id,
          subGoal.name,
          'subgoal',
          subGoal.id,
          1, // SubGoals of orphaned goals are at level 1
          subGoal.order,
          '#808080' // Default gray color for orphaned subgoals
        );

        goalFolder.children.push(subGoalFolder);
      }

      goalFolder.children.sort((a, b) => a.order - b.order);
      rootFolders.push(goalFolder);
    }

    // Sort root folders by order
    rootFolders.sort((a, b) => a.order - b.order);

    // Add custom folders beneath system folders (positioned at the end)
    for (const customFolder of this.customFolders) {
      const customFolderVirtual = this.createVirtualFolder(
        customFolder.id,
        customFolder.name,
        'custom',
        customFolder.id,
        0, // Custom folders are at level 0 (same as categories)
        customFolder.order + 1000, // Add offset to position after system folders
        customFolder.color
      );

      rootFolders.push(customFolderVirtual);
    }

    // Sort again to ensure custom folders are positioned correctly
    rootFolders.sort((a, b) => a.order - b.order);

    // Validate data integrity
    this.validateFolderTree(rootFolders);

    return rootFolders;
  }

  /**
   * Create a VirtualFolder with proper type and level properties
   */
  private createVirtualFolder(
    id: string,
    name: string,
    type: 'category' | 'goal' | 'subgoal' | 'custom',
    sourceId: string,
    level: number,
    order: number,
    color?: string
  ): VirtualFolder {
    return {
      id,
      name,
      type,
      sourceId,
      children: [],
      level,
      order,
      isExpanded: false, // Default to collapsed
      entryCount: 0, // Will be populated by filtering service
      color // Add color property
    };
  }

  /**
   * Validate data integrity of the built folder tree
   */
  private validateFolderTree(folders: VirtualFolder[]): void {
    const validateFolder = (folder: VirtualFolder, expectedLevel: number) => {
      // Validate level consistency
      if (folder.level !== expectedLevel) {
        console.warn(`Level mismatch for folder ${folder.name}: expected ${expectedLevel}, got ${folder.level}`);
      }

      // Validate type-level relationship
      if (folder.type === 'category' && folder.level !== 0 && folder.level !== 0) {
        console.warn(`Category ${folder.name} should be at level 0, but is at level ${folder.level}`);
      }
      if (folder.type === 'goal' && folder.level > 1) {
        console.warn(`Goal ${folder.name} should be at level 0 or 1, but is at level ${folder.level}`);
      }
      if (folder.type === 'subgoal' && folder.level > 2) {
        console.warn(`SubGoal ${folder.name} should be at level 1 or 2, but is at level ${folder.level}`);
      }

      // Recursively validate children
      folder.children.forEach(child => validateFolder(child, folder.level + 1));
    };

    folders.forEach(folder => validateFolder(folder, 0));
    console.log('Folder tree validation complete');
  }

  /**
   * Get a folder by its source ID (Prisma entity ID)
   */
  async getFolderBySourceId(sourceId: string): Promise<VirtualFolder | null> {
    const folderTree = await this.buildFolderTree();
    return this.findFolderBySourceId(folderTree, sourceId);
  }

  /**
   * Recursively find a folder by its source ID
   */
  private findFolderBySourceId(folders: VirtualFolder[], sourceId: string): VirtualFolder | null {
    for (const folder of folders) {
      if (folder.sourceId === sourceId) {
        return folder;
      }

      const found = this.findFolderBySourceId(folder.children, sourceId);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Get statistics about the folder tree
   */
  async getFolderTreeStats(): Promise<{
    totalCategories: number;
    totalGoals: number;
    totalSubGoals: number;
    maxDepth: number;
  }> {
    await this.fetchPrismaData();

    const calculateMaxDepth = (folders: VirtualFolder[]): number => {
      if (folders.length === 0) return 0;
      return Math.max(...folders.map(folder =>
        1 + calculateMaxDepth(folder.children)
      ));
    };

    const folderTree = await this.buildFolderTree();

    return {
      totalCategories: this.categories.length,
      totalGoals: this.goals.length,
      totalSubGoals: this.subGoals.length,
      maxDepth: calculateMaxDepth(folderTree)
    };
  }
}

// Create a singleton instance
export const virtualFolderTreeBuilder = new VirtualFolderTreeBuilder();
