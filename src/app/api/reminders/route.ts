import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ReminderFormSchema, UpdateReminderSchema } from '@/lib/schemas/reminders';

/**
 * GET /api/reminders
 * Fetch all reminders for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build the query
    const query: any = {
      where: {
        userId: session.user.id,
      },
      orderBy: {
        dueDate: 'asc',
      },
    };

    // Add filters if provided
    if (status) {
      query.where.status = status;
    }

    if (startDate && endDate) {
      query.where.dueDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      query.where.dueDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      query.where.dueDate = {
        lte: new Date(endDate),
      };
    }

    // Fetch reminders from the database
    const reminders = await prisma.reminder.findMany(query);

    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reminders
 * Create a new reminder
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();

    // Validate the request body against the schema
    const validationResult = ReminderFormSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Create the reminder
    const reminder = await prisma.reminder.create({
      data: {
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate,
        isRecurring: data.isRecurring,
        recurrence: data.isRecurring ? data.recurrence : null,

        // Enhanced recurrence fields
        recurrenceEndDate: data.terminationType === 'on' ? data.recurrenceEndDate : null,
        maxOccurrences: data.terminationType === 'after' ? data.maxOccurrences : null,
        recurrenceInterval: data.isRecurring ? data.recurrenceInterval : null,
        weeklyDays: data.recurrence === 'weekly' ? data.weeklyDays : null,
        monthlyType: data.recurrence === 'monthly' ? data.monthlyType : null,
        monthlyWeekday: data.recurrence === 'monthly' && data.monthlyType === 'weekday' ? data.monthlyWeekday : null,
        monthlyWeekNumber: data.recurrence === 'monthly' && data.monthlyType === 'weekday' ? data.monthlyWeekNumber : null,

        taskId: data.taskId && data.taskId !== 'none' ? data.taskId : null,
        userId: session.user.id,
        status: data.status || 'PENDING',
        isCompleted: false, // Keeping for backward compatibility
      }
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}
