'use client';

import { db } from '@/lib/db';
import { Category } from '@/types';

/**
 * Synchronizes categories between the client-side database (Dexie) and the server-side database.
 * This function is used to ensure that the categories displayed in the UI match those in the database.
 *
 * @param serverCategories - Categories from the server-side database (Prisma)
 */
export async function syncCategories(serverCategories: any[]) {
  try {
    // Get all categories from the client-side database
    const clientCategories = await db.categories.toArray();

    console.log('Client categories:', clientCategories);
    console.log('Server categories:', serverCategories);

    // Create a map of client categories by ID for quick lookup
    const clientCategoriesMap = new Map(
      clientCategories.map(cat => [cat.id, cat])
    );

    // Create a map of server categories by ID for quick lookup
    const serverCategoriesMap = new Map(
      serverCategories.map(cat => [cat.id, cat])
    );

    // Find categories that need to be added to the client database
    // (exist on server but not in client)
    const categoriesToAdd = serverCategories.filter(
      serverCat => !clientCategoriesMap.has(serverCat.id)
    );

    // Find categories that need to be updated in the client database
    // (exist in both but have different properties)
    const categoriesToUpdate = serverCategories.filter(serverCat => {
      const clientCat = clientCategoriesMap.get(serverCat.id);
      return clientCat && (
        clientCat.name !== serverCat.name ||
        clientCat.color !== serverCat.color
      );
    });

    // Find categories that need to be removed from the client database
    // (exist in client but not on server)
    const categoriesToRemove = clientCategories.filter(
      clientCat => !serverCategoriesMap.has(clientCat.id)
    );

    console.log('Categories to add:', categoriesToAdd);
    console.log('Categories to update:', categoriesToUpdate);
    console.log('Categories to remove:', categoriesToRemove);

    // Perform the synchronization operations

    // Add new categories
    if (categoriesToAdd.length > 0) {
      await db.categories.bulkAdd(
        categoriesToAdd.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: cat.color || '#808080',
          createdAt: new Date(cat.createdAt || Date.now()),
          updatedAt: new Date(cat.updatedAt || Date.now()),
        }))
      );
    }

    // Update existing categories
    for (const cat of categoriesToUpdate) {
      await db.categories.update(cat.id, {
        name: cat.name,
        color: cat.color || '#808080',
        updatedAt: new Date(cat.updatedAt || Date.now()),
      });
    }

    // Remove categories that don't exist on the server
    if (categoriesToRemove.length > 0) {
      await db.categories.bulkDelete(categoriesToRemove.map(cat => cat.id));
    }

    console.log(`Categories synchronized: ${categoriesToAdd.length} added, ${categoriesToUpdate.length} updated, ${categoriesToRemove.length} removed`);

    return {
      added: categoriesToAdd.length,
      updated: categoriesToUpdate.length,
      removed: categoriesToRemove.length,
    };
  } catch (error) {
    console.error('Error synchronizing categories:', error);
    throw error;
  }
}
