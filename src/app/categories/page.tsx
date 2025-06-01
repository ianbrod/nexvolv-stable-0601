import React from 'react';
import { prisma } from '@/lib/prisma';
import { CategoryManager } from '@/components/categories/CategoryManager';

// Get the user ID (temporary solution)
const getUserId = async (): Promise<string> => {
  return "user_placeholder";
};

export default async function CategoriesPage() {
  const userId = await getUserId();

  // Fetch categories from the database
  const categories = await prisma.category.findMany({
    where: {
      userId,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className="w-full px-4 py-4">
      <h1 className="text-2xl font-bold mb-6">Manage Categories</h1>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <CategoryManager
          categories={categories}
        />
      </div>
    </div>
  );
}