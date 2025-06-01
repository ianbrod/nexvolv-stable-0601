import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateCustomFolderSchema } from '@/lib/schemas/custom-folders';

// --- Temporary User Auth ---
const getUserId = async (): Promise<string> => {
  return "user_placeholder";
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || await getUserId();

    // Fetch custom folders with proper ordering
    const customFolders = await prisma.customFolder.findMany({
      where: { userId },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Return the custom folders directly
    return NextResponse.json(customFolders);
  } catch (error) {
    console.error("Error fetching custom folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom folders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await request.json();

    // Validate the input
    const validatedFields = CreateCustomFolderSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input data." },
        { status: 400 }
      );
    }

    // Get the next order number for this user
    const lastFolder = await prisma.customFolder.findFirst({
      where: { userId },
      orderBy: { order: 'desc' }
    });

    const nextOrder = lastFolder ? lastFolder.order + 1 : 0;

    // Create the custom folder
    const newFolder = await prisma.customFolder.create({
      data: {
        ...validatedFields.data,
        userId,
        order: nextOrder,
        color: validatedFields.data.color || '#6b7280' // Default gray
      },
    });

    return NextResponse.json({
      success: true,
      message: "Custom folder created successfully.",
      folder: newFolder
    });
  } catch (error) {
    console.error("Error creating custom folder:", error);
    return NextResponse.json(
      { success: false, message: "Database error: Failed to create custom folder." },
      { status: 500 }
    );
  }
}
