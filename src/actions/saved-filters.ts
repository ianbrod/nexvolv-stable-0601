'use server';

import { prisma } from '@/lib/prisma';
import { SavedFilter, TaskFilterOptions } from '@/types';
import { revalidatePath } from 'next/cache';
import { PLACEHOLDER_USER_ID } from '@/lib/auth-placeholder';

// Temporary user ID function until auth is implemented
const getUserId = async (): Promise<string> => {
  return PLACEHOLDER_USER_ID;
};

/**
 * Creates a new saved filter
 */
export async function createSavedFilter(
  name: string,
  filterData: TaskFilterOptions,
  description?: string,
  isDefault: boolean = false,
  isShared: boolean = false
) {
  try {
    const userId = await getUserId();
    
    // If this is set as default, unset any existing defaults
    if (isDefault) {
      await prisma.savedFilter.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }
    
    // Create the new filter
    const savedFilter = await prisma.savedFilter.create({
      data: {
        name,
        description,
        filterData: JSON.stringify(filterData),
        isDefault,
        isShared,
        userId,
      },
    });
    
    // Revalidate relevant paths
    revalidatePath('/tasks');
    
    return { success: true, savedFilter };
  } catch (error) {
    console.error('Failed to create saved filter:', error);
    return { success: false, error: 'Failed to create saved filter' };
  }
}

/**
 * Gets all saved filters for the current user
 */
export async function getSavedFilters() {
  try {
    const userId = await getUserId();
    
    const savedFilters = await prisma.savedFilter.findMany({
      where: {
        userId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return { success: true, savedFilters };
  } catch (error) {
    console.error('Failed to get saved filters:', error);
    return { success: false, error: 'Failed to get saved filters' };
  }
}

/**
 * Gets a saved filter by ID
 */
export async function getSavedFilterById(id: string) {
  try {
    const userId = await getUserId();
    
    const savedFilter = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!savedFilter) {
      return { success: false, error: 'Saved filter not found' };
    }
    
    return { success: true, savedFilter };
  } catch (error) {
    console.error('Failed to get saved filter:', error);
    return { success: false, error: 'Failed to get saved filter' };
  }
}

/**
 * Updates a saved filter
 */
export async function updateSavedFilter(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    filterData?: TaskFilterOptions;
    isDefault?: boolean;
    isShared?: boolean;
  }
) {
  try {
    const userId = await getUserId();
    
    // Check if filter exists and belongs to user
    const existingFilter = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!existingFilter) {
      return { success: false, error: 'Saved filter not found' };
    }
    
    // If setting as default, unset any existing defaults
    if (data.isDefault) {
      await prisma.savedFilter.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: id }, // Don't update the current filter
        },
        data: {
          isDefault: false,
        },
      });
    }
    
    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.filterData !== undefined) updateData.filterData = JSON.stringify(data.filterData);
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;
    if (data.isShared !== undefined) updateData.isShared = data.isShared;
    
    // Update the filter
    const updatedFilter = await prisma.savedFilter.update({
      where: { id },
      data: updateData,
    });
    
    // Revalidate relevant paths
    revalidatePath('/tasks');
    
    return { success: true, savedFilter: updatedFilter };
  } catch (error) {
    console.error('Failed to update saved filter:', error);
    return { success: false, error: 'Failed to update saved filter' };
  }
}

/**
 * Deletes a saved filter
 */
export async function deleteSavedFilter(id: string) {
  try {
    const userId = await getUserId();
    
    // Check if filter exists and belongs to user
    const existingFilter = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!existingFilter) {
      return { success: false, error: 'Saved filter not found' };
    }
    
    // Delete the filter
    await prisma.savedFilter.delete({
      where: { id },
    });
    
    // Revalidate relevant paths
    revalidatePath('/tasks');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete saved filter:', error);
    return { success: false, error: 'Failed to delete saved filter' };
  }
}
