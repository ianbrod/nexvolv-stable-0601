import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';

/**
 * POST /api/reminders/[reminderId]/snooze
 * Snooze a reminder for a specified amount of time
 */
export async function POST(
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

    // Parse the request body to get the snooze duration
    const body = await request.json();
    const snoozeMinutes = body.snoozeMinutes || 15; // Default to 15 minutes

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      // Handle virtual instances using the reminders-prisma.ts functions
      const { snoozeReminder } = await import('@/actions/reminders-prisma');
      const result = await snoozeReminder(reminderId, snoozeMinutes);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to snooze reminder' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
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

      // Calculate the new due date
      const newDueDate = addMinutes(existingReminder.dueDate, snoozeMinutes);

      // Update the reminder
      const updatedReminder = await prisma.reminder.update({
        where: {
          id: reminderId,
        },
        data: {
          dueDate: newDueDate,
          status: 'SNOOZED' as const,
        },
      });

      return NextResponse.json(updatedReminder);
    }
  } catch (error) {
    console.error('Error snoozing reminder:', error);
    return NextResponse.json(
      { error: 'Failed to snooze reminder' },
      { status: 500 }
    );
  }
}
