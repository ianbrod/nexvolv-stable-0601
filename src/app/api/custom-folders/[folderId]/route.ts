import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UpdateCustomFolderSchema } from '@/lib/schemas/custom-folders';

// --- Temporary User Auth ---
const getUserId = async (): Promise<string> => {
  return "user_placeholder";
};

export async function GET(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const userId = await getUserId();
    const { folderId } = params;

    // Fetch the custom folder
    const customFolder = await prisma.customFolder.findUnique({
      where: {
        id: folderId,
      },
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        userId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!customFolder) {
      return NextResponse.json(
        { success: false, message: "Custom folder not found" },
        { status: 404 }
      );
    }

    // Check if user owns this folder
    if (customFolder.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to access this folder" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: customFolder
    });
  } catch (error) {
    console.error("Error fetching custom folder:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch custom folder." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const userId = await getUserId();
    const { folderId } = params;
    const body = await request.json();

    // Validate the input
    const validatedFields = UpdateCustomFolderSchema.safeParse({
      id: folderId,
      ...body
    });

    if (!validatedFields.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input data." },
        { status: 400 }
      );
    }

    const { id, ...dataToUpdate } = validatedFields.data;

    // Update the custom folder
    const updateResult = await prisma.customFolder.updateMany({
      where: {
        id: folderId,
        userId,
      },
      data: dataToUpdate,
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { success: false, message: "Custom folder not found or you don't have permission to edit it." },
        { status: 404 }
      );
    }

    // Fetch the updated folder
    const updatedFolder = await prisma.customFolder.findUnique({
      where: { id: folderId }
    });

    return NextResponse.json({
      success: true,
      message: "Custom folder updated successfully.",
      folder: updatedFolder
    });
  } catch (error) {
    console.error("Error updating custom folder:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to update custom folder." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const userId = await getUserId();
    const { folderId } = params;

    // Delete the custom folder
    const deleteResult = await prisma.customFolder.deleteMany({
      where: {
        id: folderId,
        userId,
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { success: false, message: "Custom folder not found or you don't have permission to delete it." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Custom folder deleted successfully."
    });
  } catch (error) {
    console.error("Error deleting custom folder:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to delete custom folder." },
      { status: 500 }
    );
  }
}
