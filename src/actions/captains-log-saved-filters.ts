'use server';

import { prisma } from '@/lib/prisma';
import { SavedFilter, CaptainsLogFilterOptions } from '@/types';
import { revalidatePath } from 'next/cache';
import { PLACEHOLDER_USER_ID } from '@/lib/auth-placeholder';

// Temporary user ID function until auth is implemented
const getUserId = async (): Promise<string> => {
  return PLACEHOLDER_USER_ID;
};

/**
 * Creates a new saved filter for captain's log
 */
export async function createCaptainsLogSavedFilter(
  name: string,
  filterData: CaptainsLogFilterOptions,
  description?: string,
  isDefault: boolean = false,
  isShared: boolean = false
) {
  try {
    const userId = await getUserId();
    
    // If this is set as default, unset any existing defaults for captain's log
    if (isDefault) {
      await prisma.savedFilter.updateMany({
        where: {
          userId,
          type: 'captains-log',
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
        type: 'captains-log',
        userId,
      },
    });
    
    // Revalidate relevant paths
    revalidatePath('/captains-log');
    
    return { success: true, savedFilter };
  } catch (error) {
    console.error('Failed to create captain\'s log saved filter:', error);
    return { success: false, error: 'Failed to create saved filter' };
  }
}

/**
 * Gets all saved filters for captain's log for the current user
 */
export async function getCaptainsLogSavedFilters() {
  try {
    const userId = await getUserId();
    
    const savedFilters = await prisma.savedFilter.findMany({
      where: {
        userId,
        type: 'captains-log',
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return { success: true, savedFilters };
  } catch (error) {
    console.error('Failed to get captain\'s log saved filters:', error);
    return { success: false, error: 'Failed to get saved filters' };
  }
}

/**
 * Gets a captain's log saved filter by ID
 */
export async function getCaptainsLogSavedFilterById(id: string) {
  try {
    const userId = await getUserId();
    
    const savedFilter = await prisma.savedFilter.findFirst({
      where: {
        id,
        userId,
        type: 'captains-log',
      },
    });
    
    if (!savedFilter) {
      return { success: false, error: 'Saved filter not found' };
    }
    
    return { success: true, savedFilter };
  } catch (error) {
    console.error('Failed to get captain\'s log saved filter:', error);
    return { success: false, error: 'Failed to get saved filter' };
  }
}

/**
 * Updates a captain's log saved filter
 */
export async function updateCaptainsLogSavedFilter(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    filterData?: CaptainsLogFilterOptions;
    isDefault?: boolean;
    isShared?: boolean;
  }
) {
  try {
    const userId = await getUserId();
    
    // If setting as default, unset any existing defaults for captain's log
    if (data.isDefault) {
      await prisma.savedFilter.updateMany({
        where: {
          userId,
          type: 'captains-log',
          isDefault: true,
          NOT: { id },
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
    
    const savedFilter = await prisma.savedFilter.update({
      where: {
        id,
        userId,
        type: 'captains-log',
      },
      data: updateData,
    });
    
    // Revalidate relevant paths
    revalidatePath('/captains-log');
    
    return { success: true, savedFilter };
  } catch (error) {
    console.error('Failed to update captain\'s log saved filter:', error);
    return { success: false, error: 'Failed to update saved filter' };
  }
}

/**
 * Deletes a captain's log saved filter
 */
export async function deleteCaptainsLogSavedFilter(id: string) {
  try {
    const userId = await getUserId();
    
    await prisma.savedFilter.delete({
      where: {
        id,
        userId,
        type: 'captains-log',
      },
    });
    
    // Revalidate relevant paths
    revalidatePath('/captains-log');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete captain\'s log saved filter:', error);
    return { success: false, error: 'Failed to delete saved filter' };
  }
}

/**
 * Gets the default captain's log saved filter for the current user
 */
export async function getDefaultCaptainsLogSavedFilter() {
  try {
    const userId = await getUserId();
    
    const savedFilter = await prisma.savedFilter.findFirst({
      where: {
        userId,
        type: 'captains-log',
        isDefault: true,
      },
    });
    
    return { success: true, savedFilter };
  } catch (error) {
    console.error('Failed to get default captain\'s log saved filter:', error);
    return { success: false, error: 'Failed to get default saved filter' };
  }
}
