'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for tag creation/update
const tagSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tag name is required'),
  color: z.string().default('#808080'),
});

export type TagInput = z.infer<typeof tagSchema>;

// Get all tags for the current user
export async function getTags(userId: string) {
  try {
    const tags = await prisma.tag.findMany({
      where: {
        userId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return { success: true, data: tags };
  } catch (error) {
    console.error('Error fetching tags:', error);
    return { success: false, message: 'Failed to fetch tags' };
  }
}

// Create a new tag
export async function createTag(data: TagInput, userId: string) {
  try {
    // Validate input
    const validatedData = tagSchema.parse(data);
    
    // Check if tag with same name already exists for this user
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: validatedData.name,
        userId,
      },
    });
    
    if (existingTag) {
      return { success: false, message: 'A tag with this name already exists' };
    }
    
    // Create the tag
    const tag = await prisma.tag.create({
      data: {
        ...validatedData,
        userId,
      },
    });
    
    revalidatePath('/goals');
    return { success: true, data: tag };
  } catch (error) {
    console.error('Error creating tag:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message };
    }
    return { success: false, message: 'Failed to create tag' };
  }
}

// Update an existing tag
export async function updateTag(data: TagInput, userId: string) {
  try {
    // Validate input
    const validatedData = tagSchema.parse(data);
    
    if (!validatedData.id) {
      return { success: false, message: 'Tag ID is required for updates' };
    }
    
    // Check if tag exists and belongs to user
    const existingTag = await prisma.tag.findFirst({
      where: {
        id: validatedData.id,
        userId,
      },
    });
    
    if (!existingTag) {
      return { success: false, message: 'Tag not found or you do not have permission to edit it' };
    }
    
    // Check if new name conflicts with another tag
    if (validatedData.name !== existingTag.name) {
      const nameConflict = await prisma.tag.findFirst({
        where: {
          name: validatedData.name,
          userId,
          id: { not: validatedData.id },
        },
      });
      
      if (nameConflict) {
        return { success: false, message: 'A tag with this name already exists' };
      }
    }
    
    // Update the tag
    const tag = await prisma.tag.update({
      where: {
        id: validatedData.id,
      },
      data: {
        name: validatedData.name,
        color: validatedData.color,
      },
    });
    
    revalidatePath('/goals');
    return { success: true, data: tag };
  } catch (error) {
    console.error('Error updating tag:', error);
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message };
    }
    return { success: false, message: 'Failed to update tag' };
  }
}

// Delete a tag
export async function deleteTag(id: string, userId: string) {
  try {
    // Check if tag exists and belongs to user
    const existingTag = await prisma.tag.findFirst({
      where: {
        id,
        userId,
      },
    });
    
    if (!existingTag) {
      return { success: false, message: 'Tag not found or you do not have permission to delete it' };
    }
    
    // Delete the tag
    await prisma.tag.delete({
      where: {
        id,
      },
    });
    
    revalidatePath('/goals');
    return { success: true, message: 'Tag deleted successfully' };
  } catch (error) {
    console.error('Error deleting tag:', error);
    return { success: false, message: 'Failed to delete tag' };
  }
}

// Add a tag to a goal
export async function addTagToGoal(tagId: string, goalId: string, userId: string) {
  try {
    // Check if tag exists and belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
    });
    
    if (!tag) {
      return { success: false, message: 'Tag not found or you do not have permission to use it' };
    }
    
    // Check if goal exists and belongs to user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });
    
    if (!goal) {
      return { success: false, message: 'Goal not found or you do not have permission to edit it' };
    }
    
    // Check if tag is already applied to goal
    const existingTagOnGoal = await prisma.tagsOnGoals.findFirst({
      where: {
        tagId,
        goalId,
      },
    });
    
    if (existingTagOnGoal) {
      return { success: false, message: 'This tag is already applied to the goal' };
    }
    
    // Add tag to goal
    await prisma.tagsOnGoals.create({
      data: {
        tagId,
        goalId,
      },
    });
    
    revalidatePath('/goals');
    return { success: true, message: 'Tag added to goal successfully' };
  } catch (error) {
    console.error('Error adding tag to goal:', error);
    return { success: false, message: 'Failed to add tag to goal' };
  }
}

// Remove a tag from a goal
export async function removeTagFromGoal(tagId: string, goalId: string, userId: string) {
  try {
    // Check if tag exists and belongs to user
    const tag = await prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
    });
    
    if (!tag) {
      return { success: false, message: 'Tag not found or you do not have permission to use it' };
    }
    
    // Check if goal exists and belongs to user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });
    
    if (!goal) {
      return { success: false, message: 'Goal not found or you do not have permission to edit it' };
    }
    
    // Check if tag is applied to goal
    const tagOnGoal = await prisma.tagsOnGoals.findFirst({
      where: {
        tagId,
        goalId,
      },
    });
    
    if (!tagOnGoal) {
      return { success: false, message: 'This tag is not applied to the goal' };
    }
    
    // Remove tag from goal
    await prisma.tagsOnGoals.delete({
      where: {
        id: tagOnGoal.id,
      },
    });
    
    revalidatePath('/goals');
    return { success: true, message: 'Tag removed from goal successfully' };
  } catch (error) {
    console.error('Error removing tag from goal:', error);
    return { success: false, message: 'Failed to remove tag from goal' };
  }
}

// Get all tags for a specific goal
export async function getTagsForGoal(goalId: string, userId: string) {
  try {
    // Check if goal exists and belongs to user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
      },
    });
    
    if (!goal) {
      return { success: false, message: 'Goal not found or you do not have permission to view it' };
    }
    
    // Get tags for goal
    const tagsOnGoal = await prisma.tagsOnGoals.findMany({
      where: {
        goalId,
      },
      include: {
        tag: true,
      },
    });
    
    const tags = tagsOnGoal.map(tagOnGoal => tagOnGoal.tag);
    
    return { success: true, data: tags };
  } catch (error) {
    console.error('Error fetching tags for goal:', error);
    return { success: false, message: 'Failed to fetch tags for goal' };
  }
}
