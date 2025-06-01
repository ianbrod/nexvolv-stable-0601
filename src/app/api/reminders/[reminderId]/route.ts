import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UpdateReminderSchema } from '@/lib/schemas/reminders';

/**
 * GET /api/reminders/[reminderId]
 * Fetch a specific reminder by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { reminderId: string } }
) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { reminderId } = params;

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      // Handle virtual instances using the reminders-prisma.ts functions
      const { getReminderById } = await import('@/actions/reminders-prisma');
      const result = await getReminderById(reminderId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 404 }
        );
      }

      // Check if the reminder belongs to the authenticated user
      if (result.reminder.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      return NextResponse.json(result.reminder);
    } else {
      // Fetch the reminder from the database
      const reminder = await prisma.reminder.findUnique({
        where: {
          id: reminderId,
        },
      });

      if (!reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }

      // Check if the reminder belongs to the authenticated user
      if (reminder.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      return NextResponse.json(reminder);
    }
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reminders/[reminderId]
 * Update a specific reminder by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { reminderId: string } }
) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { reminderId } = params;

    // Parse and validate the request body
    const body = await request.json();

    // Validate the request body against the schema
    const validationResult = UpdateReminderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if the reminder exists and belongs to the user
    const existingReminder = await prisma.reminder.findUnique({
      where: {
        id: reminderId,
      },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    if (existingReminder.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update the reminder
    const updatedReminder = await prisma.reminder.update({
      where: {
        id: reminderId,
      },
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        isRecurring: data.isRecurring,
        recurrence: data.isRecurring ? data.recurrence : null,
        status: data.status,
        // Only update these if they're provided
        ...(data.isCompleted !== undefined && { isCompleted: data.isCompleted }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    });

    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reminders/[reminderId]
 * Delete a specific reminder by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reminderId: string } }
) {
  try {
    console.log("API route: DELETE /api/reminders/[reminderId] called for ID:", params.reminderId);

    // Get the authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log("API route: Unauthorized - No session user");
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { reminderId } = params;
    console.log("API route: Deleting reminder with ID:", reminderId);

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      console.log("API route: Handling virtual instance deletion");
      // Use the server action for virtual instances
      const { deleteReminder } = await import('@/actions/reminders-prisma');
      const result = await deleteReminder(reminderId);
      console.log("API route: Virtual instance deletion result:", result);

      if (!result.success) {
        console.error("API route: Error deleting virtual instance:", result.error);
        return NextResponse.json(
          { error: result.error || 'Failed to delete reminder' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      console.log("API route: Handling regular reminder deletion");
      // For regular reminders, check if it exists and belongs to the user
      const existingReminder = await prisma.reminder.findUnique({
        where: {
          id: reminderId,
        },
      });

      console.log("API route: Reminder found:", !!existingReminder);

      if (!existingReminder) {
        console.error("API route: Reminder not found for ID:", reminderId);
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }

      if (existingReminder.userId !== session.user.id) {
        console.error("API route: Unauthorized - Reminder belongs to different user");
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }

      // Use the server action for consistency
      console.log("API route: Using server action to delete regular reminder");
      const { deleteReminder } = await import('@/actions/reminders-prisma');
      const result = await deleteReminder(reminderId);
      console.log("API route: Regular reminder deletion result:", result);

      if (!result.success) {
        console.error("API route: Error deleting regular reminder:", result.error);
        return NextResponse.json(
          { error: result.error || 'Failed to delete reminder' },
          { status: 500 }
        );
      }

      console.log("API route: Reminder deleted successfully");
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('API route: Error deleting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
