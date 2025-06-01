'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { CreateCustomFolderSchema, UpdateCustomFolderSchema } from '@/lib/schemas/custom-folders';

// --- Temporary User Auth ---
const getUserId = async (): Promise<string> => {
  // In a real app, fetch user session here
  return "user_placeholder";
};

/**
 * Get all custom folders for the current user
 */
export async function getCustomFolders() {
  const userId = await getUserId();

  try {
    const customFolders = await prisma.customFolder.findMany({
      where: { userId },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    return customFolders;
  } catch (error) {
    console.error("Error fetching custom folders:", error);
    return [];
  }
}

/**
 * Create a new custom folder
 */
export async function createCustomFolder(values: z.infer<typeof CreateCustomFolderSchema>) {
  const userId = await getUserId();

  // Validate input
  const validatedFields = CreateCustomFolderSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid input data." };
  }

  try {
    // Get the next order number for this user
    const lastFolder = await prisma.customFolder.findFirst({
      where: { userId },
      orderBy: { order: 'desc' }
    });

    const nextOrder = lastFolder ? lastFolder.order + 1 : 0;

    const newFolder = await prisma.customFolder.create({
      data: {
        ...validatedFields.data,
        userId,
        order: nextOrder,
        color: validatedFields.data.color || '#6b7280' // Default gray
      },
    });

    revalidatePath('/captainslog');
    return { success: true, message: "Custom folder created successfully.", folder: newFolder };
  } catch (error) {
    console.error("Error creating custom folder:", error);
    return { success: false, message: "Database error: Failed to create custom folder." };
  }
}

/**
 * Update a custom folder
 */
export async function updateCustomFolder(values: z.infer<typeof UpdateCustomFolderSchema>) {
  const userId = await getUserId();

  // Validate input
  const validatedFields = UpdateCustomFolderSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid input data." };
  }

  const { id, ...dataToUpdate } = validatedFields.data;

  try {
    const updateResult = await prisma.customFolder.updateMany({
      where: {
        id,
        userId,
      },
      data: dataToUpdate,
    });

    if (updateResult.count === 0) {
      return { success: false, message: "Custom folder not found or you don't have permission to edit it." };
    }

    revalidatePath('/captainslog');
    return { success: true, message: "Custom folder updated successfully." };
  } catch (error) {
    console.error("Error updating custom folder:", error);
    return { success: false, message: "Database error: Failed to update custom folder." };
  }
}

/**
 * Delete a custom folder
 */
export async function deleteCustomFolder(id: string) {
  const userId = await getUserId();

  if (!id) {
    return { success: false, message: "Folder ID is required." };
  }

  try {
    console.log('Attempting to delete custom folder with ID:', id);

    // Delete the custom folder
    const deleteResult = await prisma.customFolder.deleteMany({
      where: {
        id,
        userId,
      },
    });

    console.log('Delete custom folder result:', deleteResult);

    if (deleteResult.count === 0) {
      return { success: false, message: "Custom folder not found or you don't have permission to delete it." };
    }

    revalidatePath('/captainslog');
    return { success: true, message: "Custom folder deleted successfully." };
  } catch (error) {
    console.error("Error deleting custom folder:", error);
    return { success: false, message: "Database error: Failed to delete custom folder." };
  }
}

/**
 * Reorder custom folders
 */
export async function reorderCustomFolders(folderIds: string[]) {
  const userId = await getUserId();

  try {
    // Update each folder with its new order
    const updatePromises = folderIds.map((folderId, index) =>
      prisma.customFolder.updateMany({
        where: {
          id: folderId,
          userId,
        },
        data: {
          order: index,
        },
      })
    );

    await Promise.all(updatePromises);

    revalidatePath('/captainslog');
    return { success: true, message: "Custom folders reordered successfully." };
  } catch (error) {
    console.error("Error reordering custom folders:", error);
    return { success: false, message: "Database error: Failed to reorder custom folders." };
  }
}
