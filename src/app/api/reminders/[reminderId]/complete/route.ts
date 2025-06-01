import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/reminders/[reminderId]/complete
 * Mark a reminder as completed
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

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      // Handle virtual instances using the reminders-prisma.ts functions
      const { completeReminder } = await import('@/actions/reminders-prisma');
      const result = await completeReminder(reminderId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
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

      // Update the reminder
      const updatedReminder = await prisma.reminder.update({
        where: {
          id: reminderId,
        },
        data: {
          status: 'COMPLETED' as const,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      return NextResponse.json(updatedReminder);
    }
  } catch (error) {
    console.error('Error completing reminder:', error);
    return NextResponse.json(
      { error: 'Failed to complete reminder' },
      { status: 500 }
    );
  }
}
