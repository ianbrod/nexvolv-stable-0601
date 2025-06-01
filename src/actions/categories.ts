'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// --- Temporary User Auth ---
const getUserId = async (): Promise<string> => {
  // In a real app, fetch user session here
  return "user_placeholder";
};

/**
 * Get all categories for the current user
 *
 * @returns Array of categories
 */
export async function getCategories() {
  const userId = await getUserId();

  try {
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// --- Category Schemas ---
const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format"),
});

const UpdateCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Category name is required").max(50),
  color: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format"),
});

const UpdateCategoryOrderSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    order: z.number(),
  })),
});

// --- Create Category Action ---
export async function createCategory(values: z.infer<typeof CreateCategorySchema>) {
  const userId = await getUserId();

  // Validate input
  const validatedFields = CreateCategorySchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid input data." };
  }

  try {
    const newCategory = await prisma.category.create({
      data: {
        ...validatedFields.data,
        userId,
      },
    });
    revalidatePath('/goals');
    revalidatePath('/categories');
    return { success: true, message: "Category created successfully.", category: newCategory };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, message: "Database error: Failed to create category." };
  }
}

// --- Update Category Action ---
export async function updateCategory(values: z.infer<typeof UpdateCategorySchema>) {
  const userId = await getUserId();

  // Validate input
  const validatedFields = UpdateCategorySchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid input data." };
  }

  const { id, ...dataToUpdate } = validatedFields.data;

  try {
    const updateResult = await prisma.category.updateMany({
      where: {
        id,
        userId,
      },
      data: dataToUpdate,
    });

    if (updateResult.count === 0) {
      return { success: false, message: "Category not found or you don't have permission to edit it." };
    }

    revalidatePath('/goals');
    revalidatePath('/categories');
    return { success: true, message: "Category updated successfully." };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, message: "Database error: Failed to update category." };
  }
}

// --- Delete Category Action ---
export async function deleteCategory(id: string) {
  const userId = await getUserId();

  console.log('deleteCategory server action called with id:', id);

  if (!id || typeof id !== 'string') {
    console.error('Invalid Category ID provided:', id);
    return { success: false, message: "Invalid Category ID provided." };
  }

  try {
    console.log('Attempting to delete category with ID:', id);

    // First, update any goals that use this category to set categoryId to null
    const goalsUpdateResult = await prisma.goal.updateMany({
      where: {
        categoryId: id,
        userId,
      },
      data: {
        categoryId: null,
      },
    });

    console.log('Updated goals result:', goalsUpdateResult);

    // Then delete the category
    const deleteResult = await prisma.category.deleteMany({
      where: {
        id,
        userId,
      },
    });

    console.log('Delete category result:', deleteResult);

    if (deleteResult.count === 0) {
      return { success: false, message: "Category not found or you don't have permission to delete it." };
    }

    revalidatePath('/goals');
    revalidatePath('/categories');
    return { success: true, message: "Category deleted successfully." };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, message: "Database error: Failed to delete category." };
  }
}

// --- Update Category Order Action ---
export async function updateCategoryOrder(values: z.infer<typeof UpdateCategoryOrderSchema>) {
  const userId = await getUserId();

  // Validate input
  const validatedFields = UpdateCategoryOrderSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid input data" };
  }

  try {
    // Update each category's order in a transaction
    const result = await prisma.$transaction(
      validatedFields.data.categories.map((category) =>
        prisma.category.update({
          where: {
            id: category.id,
            userId: userId,
          },
          data: {
            order: category.order,
          },
        })
      )
    );

    // Ensure all paths that display categories are revalidated
    revalidatePath('/goals');
    revalidatePath('/categories');
    revalidatePath('/');
    return { success: true, message: "Category order updated successfully" };
  } catch (error) {
    console.error('Error updating category order:', error);
    return { success: false, message: "Failed to update category order" };
  }
}