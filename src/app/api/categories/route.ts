import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || await getUserId();

    // Fetch categories with proper ordering for folder tree
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        order: true,
        color: true
      }
    });

    // Return the categories directly (not wrapped in success object)
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
