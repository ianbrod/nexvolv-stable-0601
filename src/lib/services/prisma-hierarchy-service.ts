/**
 * Prisma Hierarchy Service
 * Provides efficient data fetching for Categories, Goals, and SubGoals via API routes
 * Implements caching and optimized queries for folder tree building
 */

// Helper function to get user ID (matches existing pattern)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * Interface for cached hierarchy data
 */
interface HierarchyCache {
  categories: CategoryData[];
  goals: GoalData[];
  subGoals: SubGoalData[];
  lastUpdated: Date;
  ttl: number; // Time to live in milliseconds
}

/**
 * Simplified interfaces for hierarchy data
 */
export interface CategoryData {
  id: string;
  name: string;
  order: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalData {
  id: string;
  name: string;
  categoryId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubGoalData {
  id: string;
  name: string;
  parentGoalId: string;
  categoryId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for fetching and caching Prisma hierarchy data
 */
export class PrismaHierarchyService {
  private cache: HierarchyCache | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Get all categories with proper ordering via API
   */
  async getCategories(forceRefresh = false): Promise<CategoryData[]> {
    if (!forceRefresh && this.isCacheValid()) {
      return this.cache!.categories;
    }

    try {
      const userId = await getUserId();

      const response = await fetch(`/api/categories?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const categories = await response.json();

      console.log(`Fetched ${categories.length} categories from API`);

      // Update cache
      await this.updateCache();

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get all goals (parent goals only) with proper ordering via API
   */
  async getGoals(forceRefresh = false): Promise<GoalData[]> {
    if (!forceRefresh && this.isCacheValid()) {
      return this.cache!.goals;
    }

    try {
      const userId = await getUserId();

      const response = await fetch(`/api/goals?userId=${userId}&includeArchived=false`);
      if (!response.ok) {
        throw new Error(`Failed to fetch goals: ${response.statusText}`);
      }

      const allGoals = await response.json();

      // Filter to only parent goals (no parentGoalId)
      const goals = allGoals.filter((goal: any) => goal.parentGoalId === null);

      console.log(`Fetched ${goals.length} goals from API`);

      // Update cache
      await this.updateCache();

      return goals;
    } catch (error) {
      console.error('Error fetching goals:', error);
      throw error;
    }
  }

  /**
   * Get all subgoals with proper ordering via API
   */
  async getSubGoals(forceRefresh = false): Promise<SubGoalData[]> {
    if (!forceRefresh && this.isCacheValid()) {
      return this.cache!.subGoals;
    }

    try {
      const userId = await getUserId();

      const response = await fetch(`/api/goals?userId=${userId}&includeArchived=false`);
      if (!response.ok) {
        throw new Error(`Failed to fetch goals: ${response.statusText}`);
      }

      const allGoals = await response.json();

      // Transform to SubGoalData (filter for subgoals and ensure parentGoalId is not null)
      const typedSubGoals: SubGoalData[] = allGoals
        .filter((goal: any) => goal.parentGoalId !== null)
        .map((goal: any) => ({
          ...goal,
          parentGoalId: goal.parentGoalId!
        }));

      console.log(`Fetched ${typedSubGoals.length} subgoals from API`);

      // Update cache
      await this.updateCache();

      return typedSubGoals;
    } catch (error) {
      console.error('Error fetching subgoals:', error);
      throw error;
    }
  }

  /**
   * Get goals by category ID
   */
  async getGoalsByCategory(categoryId: string, forceRefresh = false): Promise<GoalData[]> {
    const allGoals = await this.getGoals(forceRefresh);
    return allGoals.filter(goal => goal.categoryId === categoryId);
  }

  /**
   * Get subgoals by parent goal ID
   */
  async getSubGoalsByGoal(goalId: string, forceRefresh = false): Promise<SubGoalData[]> {
    const allSubGoals = await this.getSubGoals(forceRefresh);
    return allSubGoals.filter(subGoal => subGoal.parentGoalId === goalId);
  }

  /**
   * Get complete hierarchy data in one call via API
   */
  async getCompleteHierarchy(forceRefresh = false): Promise<{
    categories: CategoryData[];
    goals: GoalData[];
    subGoals: SubGoalData[];
  }> {
    if (!forceRefresh && this.isCacheValid()) {
      return {
        categories: this.cache!.categories,
        goals: this.cache!.goals,
        subGoals: this.cache!.subGoals
      };
    }

    try {
      const userId = await getUserId();

      // Fetch all data concurrently for optimal performance via API
      const [categoriesResponse, goalsResponse] = await Promise.all([
        fetch(`/api/categories?userId=${userId}`),
        fetch(`/api/goals?userId=${userId}&includeArchived=false`)
      ]);

      if (!categoriesResponse.ok) {
        throw new Error(`Failed to fetch categories: ${categoriesResponse.statusText}`);
      }
      if (!goalsResponse.ok) {
        throw new Error(`Failed to fetch goals: ${goalsResponse.statusText}`);
      }

      const categories = await categoriesResponse.json();
      const allGoals = await goalsResponse.json();

      // Separate goals and subgoals
      const goals = allGoals.filter((goal: any) => goal.parentGoalId === null);
      const subGoals: SubGoalData[] = allGoals
        .filter((goal: any) => goal.parentGoalId !== null)
        .map((goal: any) => ({
          ...goal,
          parentGoalId: goal.parentGoalId!
        }));

      // Update cache
      this.cache = {
        categories,
        goals,
        subGoals,
        lastUpdated: new Date(),
        ttl: this.CACHE_TTL
      };

      console.log(`Fetched complete hierarchy: ${categories.length} categories, ${goals.length} goals, ${subGoals.length} subgoals`);

      return { categories, goals, subGoals };
    } catch (error) {
      console.error('Error fetching complete hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get hierarchy statistics
   */
  async getHierarchyStats(): Promise<{
    totalCategories: number;
    totalGoals: number;
    totalSubGoals: number;
    goalsPerCategory: Record<string, number>;
    subGoalsPerGoal: Record<string, number>;
  }> {
    const { categories, goals, subGoals } = await this.getCompleteHierarchy();

    // Calculate goals per category
    const goalsPerCategory: Record<string, number> = {};
    categories.forEach(category => {
      goalsPerCategory[category.id] = goals.filter(goal => goal.categoryId === category.id).length;
    });

    // Calculate subgoals per goal
    const subGoalsPerGoal: Record<string, number> = {};
    goals.forEach(goal => {
      subGoalsPerGoal[goal.id] = subGoals.filter(subGoal => subGoal.parentGoalId === goal.id).length;
    });

    return {
      totalCategories: categories.length,
      totalGoals: goals.length,
      totalSubGoals: subGoals.length,
      goalsPerCategory,
      subGoalsPerGoal
    };
  }

  /**
   * Invalidate cache to force refresh on next request
   */
  invalidateCache(): void {
    this.cache = null;
    console.log('Prisma hierarchy cache invalidated');
  }

  /**
   * Check if cache is valid and not expired
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;

    const now = new Date();
    const cacheAge = now.getTime() - this.cache.lastUpdated.getTime();

    return cacheAge < this.cache.ttl;
  }

  /**
   * Update cache with fresh data
   */
  private async updateCache(): Promise<void> {
    // This method is called after individual fetches
    // The cache is updated in getCompleteHierarchy
    if (!this.cache) {
      await this.getCompleteHierarchy(true);
    }
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): {
    isCached: boolean;
    lastUpdated: Date | null;
    isValid: boolean;
    ageInMinutes: number | null;
  } {
    if (!this.cache) {
      return {
        isCached: false,
        lastUpdated: null,
        isValid: false,
        ageInMinutes: null
      };
    }

    const now = new Date();
    const ageInMs = now.getTime() - this.cache.lastUpdated.getTime();
    const ageInMinutes = Math.round(ageInMs / (1000 * 60));

    return {
      isCached: true,
      lastUpdated: this.cache.lastUpdated,
      isValid: this.isCacheValid(),
      ageInMinutes
    };
  }
}

// Create a singleton instance
export const prismaHierarchyService = new PrismaHierarchyService();
