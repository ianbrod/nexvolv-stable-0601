/**
 * Log Filtering Service
 * Implements hierarchical filtering logic for Captain's Log entries
 * Supports inheritance-based filtering where parent folders show child content
 */

import { captainsLogDB } from '@/lib/storage/tag-database';
import { LogEntry } from '@/types';
import { VirtualFolder } from '@/types/virtual-folder';
import { virtualFolderTreeBuilder } from './virtual-folder-tree-builder';

/**
 * Interface for filtering options
 */
export interface FilterOptions {
  folderId?: string;           // Virtual folder ID to filter by
  sourceId?: string;           // Prisma entity ID to filter by
  folderType?: 'category' | 'goal' | 'subgoal'; // Type of folder
  includeArchived?: boolean;   // Whether to include archived entries
  searchTerm?: string;         // Text search term
  isFavorite?: boolean;        // Filter by favorite status
}

/**
 * Interface for filter results
 */
export interface FilterResult {
  entries: LogEntry[];
  totalCount: number;
  filteredCount: number;
  appliedFilters: {
    folderId?: string;
    sourceId?: string;
    folderType?: string;
    hasSearch: boolean;
    isFavoriteFilter: boolean;
  };
}

/**
 * Service for filtering Captain's Log entries with hierarchical logic
 */
export class LogFilteringService {
  private folderTree: VirtualFolder[] = [];
  private folderLookup: Map<string, VirtualFolder> = new Map();

  /**
   * Initialize the service by building folder tree and lookup maps
   */
  async initialize(): Promise<void> {
    try {
      this.folderTree = await virtualFolderTreeBuilder.buildFolderTree();
      this.buildFolderLookup();
      console.log('Log filtering service initialized');
    } catch (error) {
      console.error('Error initializing log filtering service:', error);
      throw error;
    }
  }

  /**
   * Filter log entries based on hierarchical folder selection
   */
  async filterEntries(options: FilterOptions = {}): Promise<FilterResult> {
    try {
      // Ensure service is initialized
      if (this.folderTree.length === 0) {
        await this.initialize();
      }

      // Get all log entries
      const allEntries = await this.getAllLogEntries();
      let filteredEntries = [...allEntries];

      // Apply folder-based filtering with inheritance
      if (options.folderId || options.sourceId) {
        filteredEntries = this.applyHierarchicalFilter(filteredEntries, options);
      }

      // Apply additional filters
      if (options.searchTerm) {
        filteredEntries = this.applySearchFilter(filteredEntries, options.searchTerm);
      }

      if (options.isFavorite !== undefined) {
        filteredEntries = filteredEntries.filter(entry => entry.isFavorite === options.isFavorite);
      }

      if (!options.includeArchived) {
        filteredEntries = filteredEntries.filter(entry => !entry.isArchived);
      }

      return {
        entries: filteredEntries,
        totalCount: allEntries.length,
        filteredCount: filteredEntries.length,
        appliedFilters: {
          folderId: options.folderId,
          sourceId: options.sourceId,
          folderType: options.folderType,
          hasSearch: !!options.searchTerm,
          isFavoriteFilter: options.isFavorite !== undefined
        }
      };
    } catch (error) {
      console.error('Error filtering entries:', error);
      throw error;
    }
  }

  /**
   * Apply hierarchical filtering logic based on folder type
   */
  private applyHierarchicalFilter(entries: LogEntry[], options: FilterOptions): LogEntry[] {
    const sourceId = options.sourceId || this.getSourceIdFromFolderId(options.folderId);
    const folderType = options.folderType || this.getFolderTypeFromId(options.folderId);

    if (!sourceId || !folderType) {
      console.warn('Could not determine source ID or folder type for filtering');
      return entries;
    }

    console.log(`Applying hierarchical filter: ${folderType} with sourceId ${sourceId}`);

    switch (folderType) {
      case 'category':
        return this.filterByCategory(entries, sourceId);
      case 'goal':
        return this.filterByGoal(entries, sourceId);
      case 'subgoal':
        return this.filterBySubGoal(entries, sourceId);
      default:
        console.warn(`Unknown folder type: ${folderType}`);
        return entries;
    }
  }

  /**
   * Category filter: include all child goals and subgoals
   */
  private filterByCategory(entries: LogEntry[], categoryId: string): LogEntry[] {
    // Get all goal and subgoal IDs under this category
    const relatedIds = this.getRelatedEntityIds(categoryId, 'category');

    return entries.filter(entry => {
      // Check single folder association
      if (entry.folderId) {
        // Direct category association
        if (entry.folderId === `category:${categoryId}`) {
          return true;
        }

        // Associated with goals in this category
        if (entry.folderId.startsWith('goal:') && relatedIds.goalIds.includes(entry.folderId.substring(5))) {
          return true;
        }

        // Associated with subgoals under goals in this category
        if (entry.folderId.startsWith('subgoal:') && relatedIds.subGoalIds.includes(entry.folderId.substring(8))) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Goal filter: include all child subgoals
   */
  private filterByGoal(entries: LogEntry[], goalId: string): LogEntry[] {
    // Get all subgoal IDs under this goal
    const relatedIds = this.getRelatedEntityIds(goalId, 'goal');

    return entries.filter(entry => {
      if (entry.folderId) {
        // Direct goal association
        if (entry.folderId === `goal:${goalId}`) {
          return true;
        }

        // Associated with subgoals under this goal
        if (entry.folderId.startsWith('subgoal:') && relatedIds.subGoalIds.includes(entry.folderId.substring(8))) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * SubGoal filter: exact match only
   */
  private filterBySubGoal(entries: LogEntry[], subGoalId: string): LogEntry[] {
    return entries.filter(entry => entry.folderId === `subgoal:${subGoalId}`);
  }

  /**
   * Get related entity IDs for hierarchical filtering
   */
  private getRelatedEntityIds(sourceId: string, type: 'category' | 'goal'): {
    goalIds: string[];
    subGoalIds: string[];
  } {
    const goalIds: string[] = [];
    const subGoalIds: string[] = [];

    if (type === 'category') {
      // Find all goals in this category
      this.folderTree.forEach(categoryFolder => {
        if (categoryFolder.sourceId === sourceId && categoryFolder.type === 'category') {
          categoryFolder.children.forEach(goalFolder => {
            if (goalFolder.type === 'goal') {
              goalIds.push(goalFolder.sourceId);

              // Find all subgoals under this goal
              goalFolder.children.forEach(subGoalFolder => {
                if (subGoalFolder.type === 'subgoal') {
                  subGoalIds.push(subGoalFolder.sourceId);
                }
              });
            }
          });
        }
      });
    } else if (type === 'goal') {
      // Find all subgoals under this goal
      const goalFolder = this.findFolderBySourceId(sourceId);
      if (goalFolder && goalFolder.type === 'goal') {
        goalFolder.children.forEach(subGoalFolder => {
          if (subGoalFolder.type === 'subgoal') {
            subGoalIds.push(subGoalFolder.sourceId);
          }
        });
      }
    }

    return { goalIds, subGoalIds };
  }

  /**
   * Apply text search filter
   */
  private applySearchFilter(entries: LogEntry[], searchTerm: string): LogEntry[] {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return entries;

    return entries.filter(entry =>
      entry.title.toLowerCase().includes(term) ||
      entry.transcription.toLowerCase().includes(term) ||
      (entry.summary && entry.summary.toLowerCase().includes(term))
    );
  }

  /**
   * Get all log entries from IndexedDB
   */
  private async getAllLogEntries(): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries.toArray();
      const transcriptionData = await captainsLogDB.transcriptionData.toArray();

      // Create a map for quick transcription lookup
      const transcriptionMap = new Map();
      transcriptionData.forEach(data => {
        transcriptionMap.set(data.entryId, data);
      });

      // Convert DB entries to LogEntry format
      return dbEntries.map(dbEntry => {
        const transcription = transcriptionMap.get(dbEntry.id);
        return {
          id: dbEntry.id,
          title: dbEntry.title,
          audioUrl: dbEntry.audioUrl || '',
          transcription: transcription?.text || '',
          summary: transcription?.summary,
          duration: dbEntry.duration,
          createdAt: dbEntry.createdAt,
          updatedAt: dbEntry.updatedAt,
          isFavorite: dbEntry.isFavorite || false,
          segments: transcription?.segments,
          srtData: transcription?.srtData,
          folderId: dbEntry.folderId,
          folderType: dbEntry.folderType,
          isArchived: dbEntry.isArchived,
          archivedAt: dbEntry.archivedAt
        };
      });
    } catch (error) {
      console.error('Error fetching log entries:', error);
      throw error;
    }
  }

  /**
   * Build lookup map for quick folder access
   */
  private buildFolderLookup(): void {
    this.folderLookup.clear();

    const addToLookup = (folder: VirtualFolder) => {
      this.folderLookup.set(folder.id, folder);
      this.folderLookup.set(folder.sourceId, folder);
      folder.children.forEach(addToLookup);
    };

    this.folderTree.forEach(addToLookup);
  }

  /**
   * Get source ID from folder ID
   */
  private getSourceIdFromFolderId(folderId?: string): string | undefined {
    if (!folderId) return undefined;
    const folder = this.folderLookup.get(folderId);
    return folder?.sourceId;
  }

  /**
   * Get folder type from folder ID
   */
  private getFolderTypeFromId(folderId?: string): 'category' | 'goal' | 'subgoal' | undefined {
    if (!folderId) return undefined;
    const folder = this.folderLookup.get(folderId);
    return folder?.type;
  }

  /**
   * Find folder by source ID
   */
  private findFolderBySourceId(sourceId: string): VirtualFolder | undefined {
    return this.folderLookup.get(sourceId);
  }

  /**
   * Check if an entry matches a specific filter
   */
  entryMatchesFilter(entry: LogEntry, filterId: string, virtualFolders: VirtualFolder[]): boolean {
    // Handle special filters
    if (filterId === 'recent') return true;
    if (filterId === 'favorites') return entry.isFavorite || false;
    if (filterId === 'uncategorized') {
      return !entry.folderId;
    }

    // Handle folder filters
    if (filterId.startsWith('folder:')) {
      const folderId = filterId.replace('folder:', '');
      const folder = this.findFolderById(virtualFolders, folderId);
      if (!folder) return false;

      return this.entryMatchesFolder(entry, folder);
    }

    return false;
  }

  /**
   * Check if an entry matches a specific filter with inheritance tracking
   */
  entryMatchesFilterWithInheritance(entry: LogEntry, filterId: string, virtualFolders: VirtualFolder[]): {
    matches: boolean;
    inheritedFrom?: string[];
    explicitAssociations?: string[];
  } {
    // Handle special filters (no inheritance)
    if (filterId === 'recent') return { matches: true };
    if (filterId === 'favorites') return { matches: entry.isFavorite || false };
    if (filterId === 'uncategorized') {
      const matches = !entry.folderId;
      return { matches };
    }

    // Handle folder filters with inheritance tracking
    if (filterId.startsWith('folder:')) {
      const folderId = filterId.replace('folder:', '');
      const folder = this.findFolderById(virtualFolders, folderId);
      if (!folder) return { matches: false };

      return this.entryMatchesFolderWithInheritance(entry, folder, virtualFolders);
    }

    return { matches: false };
  }

  /**
   * Check if an entry matches a folder (basic version)
   */
  private entryMatchesFolder(entry: LogEntry, folder: VirtualFolder): boolean {
    if (!entry.folderId) return false;

    switch (folder.type) {
      case 'category':
        // Direct category match or goals/subgoals in this category
        if (entry.folderId === `category:${folder.sourceId}`) return true;
        if (entry.folderId.startsWith('goal:') && this.isGoalInCategory(entry.folderId.substring(5), folder.sourceId)) return true;
        if (entry.folderId.startsWith('subgoal:') && this.isSubGoalInCategory(entry.folderId.substring(8), folder.sourceId)) return true;
        return false;
      case 'goal':
        // Direct goal match or subgoals in this goal
        if (entry.folderId === `goal:${folder.sourceId}`) return true;
        if (entry.folderId.startsWith('subgoal:') && this.isSubGoalInGoal(entry.folderId.substring(8), folder.sourceId)) return true;
        return false;
      case 'subgoal':
        return entry.folderId === `subgoal:${folder.sourceId}`;
      default:
        return false;
    }
  }

  /**
   * Check if an entry matches a folder with inheritance tracking
   */
  private entryMatchesFolderWithInheritance(entry: LogEntry, folder: VirtualFolder, virtualFolders: VirtualFolder[]): {
    matches: boolean;
    inheritedFrom?: string[];
    explicitAssociations?: string[];
  } {
    const inheritedFrom: string[] = [];
    const explicitAssociations: string[] = [];
    let matches = false;

    if (!entry.folderId) {
      return { matches: false };
    }

    switch (folder.type) {
      case 'category':
        // Direct category association
        if (entry.folderId === `category:${folder.sourceId}`) {
          matches = true;
          explicitAssociations.push(`category:${folder.sourceId}`);
        }
        // Goal in this category
        else if (entry.folderId.startsWith('goal:')) {
          const goalId = entry.folderId.substring(5);
          if (this.isGoalInCategory(goalId, folder.sourceId)) {
            matches = true;
            explicitAssociations.push(`goal:${goalId}`);
          }
        }
        // Subgoal in this category (inherited through goal)
        else if (entry.folderId.startsWith('subgoal:')) {
          const subGoalId = entry.folderId.substring(8);
          if (this.isSubGoalInCategory(subGoalId, folder.sourceId)) {
            matches = true;
            const parentGoal = this.getParentGoalForSubGoal(subGoalId);
            if (parentGoal) {
              inheritedFrom.push(`goal:${parentGoal}`);
            }
          }
        }
        break;

      case 'goal':
        // Direct goal association
        if (entry.folderId === `goal:${folder.sourceId}`) {
          matches = true;
          explicitAssociations.push(`goal:${folder.sourceId}`);
        }
        // Subgoal in this goal
        else if (entry.folderId.startsWith('subgoal:')) {
          const subGoalId = entry.folderId.substring(8);
          if (this.isSubGoalInGoal(subGoalId, folder.sourceId)) {
            matches = true;
            explicitAssociations.push(`subgoal:${subGoalId}`);
          }
        }
        break;

      case 'subgoal':
        // Direct subgoal association only
        if (entry.folderId === `subgoal:${folder.sourceId}`) {
          matches = true;
          explicitAssociations.push(`subgoal:${folder.sourceId}`);
        }
        break;
    }

    return {
      matches,
      inheritedFrom: inheritedFrom.length > 0 ? inheritedFrom : undefined,
      explicitAssociations: explicitAssociations.length > 0 ? explicitAssociations : undefined
    };
  }

  /**
   * Helper method to find folder by ID in virtual folders array
   */
  private findFolderById(virtualFolders: VirtualFolder[], id: string): VirtualFolder | null {
    for (const folder of virtualFolders) {
      if (folder.id === id) {
        return folder;
      }
      // Recursively search children
      const found = this.findFolderById(folder.children, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * Check if a goal belongs to a category
   */
  private isGoalInCategory(goalId: string, categoryId: string): boolean {
    const goalFolder = this.findFolderBySourceId(goalId);
    if (!goalFolder || goalFolder.type !== 'goal') return false;

    // Find parent category
    for (const categoryFolder of this.folderTree) {
      if (categoryFolder.sourceId === categoryId && categoryFolder.type === 'category') {
        return categoryFolder.children.some(child => child.sourceId === goalId);
      }
    }
    return false;
  }

  /**
   * Check if a subgoal belongs to a category (through its parent goal)
   */
  private isSubGoalInCategory(subGoalId: string, categoryId: string): boolean {
    const parentGoalId = this.getParentGoalForSubGoal(subGoalId);
    return parentGoalId ? this.isGoalInCategory(parentGoalId, categoryId) : false;
  }

  /**
   * Check if a subgoal belongs to a goal
   */
  private isSubGoalInGoal(subGoalId: string, goalId: string): boolean {
    const goalFolder = this.findFolderBySourceId(goalId);
    if (!goalFolder || goalFolder.type !== 'goal') return false;

    return goalFolder.children.some(child =>
      child.sourceId === subGoalId && child.type === 'subgoal'
    );
  }

  /**
   * Get parent goal ID for a subgoal
   */
  private getParentGoalForSubGoal(subGoalId: string): string | null {
    for (const categoryFolder of this.folderTree) {
      for (const goalFolder of categoryFolder.children) {
        if (goalFolder.type === 'goal') {
          const subGoalFolder = goalFolder.children.find(child =>
            child.sourceId === subGoalId && child.type === 'subgoal'
          );
          if (subGoalFolder) {
            return goalFolder.sourceId;
          }
        }
      }
    }
    return null;
  }

  /**
   * Update entry count for folders based on current filter results
   */
  async updateFolderEntryCounts(): Promise<VirtualFolder[]> {
    const updateCounts = async (folder: VirtualFolder): Promise<void> => {
      const filterResult = await this.filterEntries({
        sourceId: folder.sourceId,
        folderType: folder.type
      });
      folder.entryCount = filterResult.filteredCount;

      // Recursively update children
      for (const child of folder.children) {
        await updateCounts(child);
      }
    };

    for (const folder of this.folderTree) {
      await updateCounts(folder);
    }

    return this.folderTree;
  }
}

// Create a singleton instance
export const logFilteringService = new LogFilteringService();
