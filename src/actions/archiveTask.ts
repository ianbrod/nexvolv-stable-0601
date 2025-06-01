'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";

export async function archiveTask(taskId: string) {
  try {
    // Update the task status to ARCHIVED
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: TaskStatus.ARCHIVED },
    });

    // Revalidate the tasks page to reflect the changes
    revalidatePath('/tasks');
    revalidatePath('/');

    return { success: true, data: updatedTask };
  } catch (error) {
    console.error('Error archiving task:', error);
    return { success: false, message: 'Failed to archive task' };
  }
}
