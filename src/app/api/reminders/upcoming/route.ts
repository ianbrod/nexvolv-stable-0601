import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';

/**
 * GET /api/reminders/upcoming
 * Fetch upcoming reminders for the authenticated user
 * 
 * Query parameters:
 * - minutes: Number of minutes to look ahead (default: 5)
 * - includeOverdue: Whether to include overdue reminders (default: true)
 * - status: Filter by status (default: PENDING)
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
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '5', 10);
    const includeOverdue = searchParams.get('includeOverdue') !== 'false';
    const status = searchParams.get('status') || 'PENDING';
    
    // Calculate the time threshold
    const now = new Date();
    const futureThreshold = addMinutes(now, minutes);
    
    // Build the query
    const query: any = {
      where: {
        userId: session.user.id,
        status: status,
      },
      orderBy: {
        dueDate: 'asc',
      },
    };
    
    // Add time constraints
    if (includeOverdue) {
      // Include reminders that are overdue or due within the next X minutes
      query.where.dueDate = {
        lte: futureThreshold,
      };
    } else {
      // Only include reminders due within the next X minutes (not overdue)
      query.where.dueDate = {
        gte: now,
        lte: futureThreshold,
      };
    }
    
    // Fetch reminders from the database
    const reminders = await prisma.reminder.findMany(query);
    
    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Error fetching upcoming reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming reminders' },
      { status: 500 }
    );
  }
}
