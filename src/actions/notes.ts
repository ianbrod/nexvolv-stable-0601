// src/actions/notes.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { CreateNoteSchema, UpdateNoteSchema } from '@/lib/schemas/notes';
import { z } from 'zod';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * Create a new note
 * @param values Note data to create
 * @returns Object containing success status and created note or error message
 */
export async function createNote(values: z.infer<typeof CreateNoteSchema>) {
  const userId = await getUserId();

  // Validate input
  const validatedFields = CreateNoteSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid input data.", errors: validatedFields.error.flatten() };
  }

  try {
    // If goalId is provided, check if it exists and belongs to the user
    if (validatedFields.data.goalId) {
      const goal = await prisma.goal.findUnique({
        where: {
          id: validatedFields.data.goalId,
          userId
        }
      });
      
      if (!goal) {
        return { success: false, message: "Goal not found" };
      }
    }
    
    // If taskId is provided, check if it exists and belongs to the user
    if (validatedFields.data.taskId) {
      const task = await prisma.task.findUnique({
        where: {
          id: validatedFields.data.taskId,
          userId
        }
      });
      
      if (!task) {
        return { success: false, message: "Task not found" };
      }
    }

    // Create the note
    const newNote = await prisma.note.create({
      data: {
        ...validatedFields.data,
        userId,
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
          }
        },
        task: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Revalidate relevant paths
    if (newNote.goalId) {
      revalidatePath(`/goals/${newNote.goalId}`);
    }
    if (newNote.taskId) {
      revalidatePath(`/tasks/${newNote.taskId}`);
    }
    
    return { success: true, message: "Note created successfully.", note: newNote };
  } catch (error) {
    console.error("Error creating note:", error);
    return { success: false, message: "Database error: Failed to create note." };
  }
}

/**
 * Update an existing note
 * @param values Note data to update
 * @returns Object containing success status and updated note or error message
 */
export async function updateNote(values: z.infer<typeof UpdateNoteSchema>) {
  const userId = await getUserId();

  // Validate input
  const validatedFields = UpdateNoteSchema.safeParse(values);
  if (!validatedFields.success) {
    return { success: false, message: "Invalid input data.", errors: validatedFields.error.flatten() };
  }

  try {
    // Check if the note exists and belongs to the user
    const existingNote = await prisma.note.findUnique({
      where: {
        id: validatedFields.data.id,
        userId
      }
    });

    if (!existingNote) {
      return { success: false, message: "Note not found or you don't have permission to update it." };
    }

    // If goalId is provided, check if it exists and belongs to the user
    if (validatedFields.data.goalId) {
      const goal = await prisma.goal.findUnique({
        where: {
          id: validatedFields.data.goalId,
          userId
        }
      });
      
      if (!goal) {
        return { success: false, message: "Goal not found" };
      }
    }
    
    // If taskId is provided, check if it exists and belongs to the user
    if (validatedFields.data.taskId) {
      const task = await prisma.task.findUnique({
        where: {
          id: validatedFields.data.taskId,
          userId
        }
      });
      
      if (!task) {
        return { success: false, message: "Task not found" };
      }
    }

    // Update the note
    const updatedNote = await prisma.note.update({
      where: {
        id: validatedFields.data.id
      },
      data: {
        title: validatedFields.data.title,
        content: validatedFields.data.content,
        goalId: validatedFields.data.goalId,
        taskId: validatedFields.data.taskId
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
          }
        },
        task: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Revalidate relevant paths
    if (updatedNote.goalId) {
      revalidatePath(`/goals/${updatedNote.goalId}`);
    }
    if (updatedNote.taskId) {
      revalidatePath(`/tasks/${updatedNote.taskId}`);
    }
    
    return { success: true, message: "Note updated successfully.", note: updatedNote };
  } catch (error) {
    console.error("Error updating note:", error);
    return { success: false, message: "Database error: Failed to update note." };
  }
}

/**
 * Delete a note
 * @param noteId ID of the note to delete
 * @returns Object containing success status and message
 */
export async function deleteNote(noteId: string) {
  const userId = await getUserId();

  try {
    // Check if the note exists and belongs to the user
    const note = await prisma.note.findUnique({
      where: {
        id: noteId,
        userId
      }
    });

    if (!note) {
      return { success: false, message: "Note not found or you don't have permission to delete it." };
    }

    // Store the IDs for revalidation
    const { goalId, taskId } = note;

    // Delete the note
    await prisma.note.delete({
      where: {
        id: noteId
      }
    });

    // Revalidate relevant paths
    if (goalId) {
      revalidatePath(`/goals/${goalId}`);
    }
    if (taskId) {
      revalidatePath(`/tasks/${taskId}`);
    }
    
    return { success: true, message: "Note deleted successfully." };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, message: "Database error: Failed to delete note." };
  }
}

/**
 * Get all notes for a goal
 * @param goalId ID of the goal to get notes for
 * @returns Object containing success status and notes or error message
 */
export async function getNotesForGoal(goalId: string) {
  const userId = await getUserId();

  try {
    // Check if the goal exists and belongs to the user
    const goal = await prisma.goal.findUnique({
      where: {
        id: goalId,
        userId
      }
    });

    if (!goal) {
      return { success: false, message: "Goal not found or you don't have permission to access it." };
    }

    // Get all notes for the goal
    const notes = await prisma.note.findMany({
      where: {
        goalId,
        userId
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
          }
        },
        task: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return { success: true, notes };
  } catch (error) {
    console.error("Error fetching notes for goal:", error);
    return { success: false, message: "Database error: Failed to fetch notes." };
  }
}

/**
 * Get all notes for a task
 * @param taskId ID of the task to get notes for
 * @returns Object containing success status and notes or error message
 */
export async function getNotesForTask(taskId: string) {
  const userId = await getUserId();

  try {
    // Check if the task exists and belongs to the user
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId
      }
    });

    if (!task) {
      return { success: false, message: "Task not found or you don't have permission to access it." };
    }

    // Get all notes for the task
    const notes = await prisma.note.findMany({
      where: {
        taskId,
        userId
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
          }
        },
        task: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return { success: true, notes };
  } catch (error) {
    console.error("Error fetching notes for task:", error);
    return { success: false, message: "Database error: Failed to fetch notes." };
  }
}
