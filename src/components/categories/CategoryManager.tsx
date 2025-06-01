'use client';

import React, { useState, useTransition, useCallback, useMemo } from 'react';

import { Category } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, PlusCircle, Save, X } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CategoryManagerProps {
  categories: Category[];
  onClose?: () => void;
}

function CategoryManagerComponent({ categories, onClose }: CategoryManagerProps) {
  const router = useRouter();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6'); // Default blue
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Memoize form validation
  const isCreateFormValid = useMemo(() => {
    return newCategoryName.trim().length > 0;
  }, [newCategoryName]);

  const isEditFormValid = useMemo(() => {
    return editingCategory?.name?.trim().length > 0;
  }, [editingCategory?.name]);

  // Handle creating a new category
  const handleCreateCategory = useCallback(() => {
    if (!newCategoryName.trim()) return;

    startTransition(async () => {
      try {
        console.log('Creating category:', { name: newCategoryName.trim(), color: newCategoryColor });
        const result = await createCategory({
          name: newCategoryName.trim(),
          color: newCategoryColor,
        });

        console.log('Create category result:', result);

        if (result.success) {
          setNewCategoryName('');
          setNewCategoryColor('#3b82f6');
          router.refresh();
          // Also update client-side database
          console.log('Category created successfully!');
        } else {
          console.error(`Failed to create category: ${result.message}`);
        }
      } catch (error) {
        console.error('Failed to create category:', error);
        console.error('An error occurred while creating the category.');
      }
    });
  }, [newCategoryName, newCategoryColor, router]);

  // Handle updating a category
  const handleUpdateCategory = useCallback(() => {
    if (!editingCategory || !editingCategory.name.trim()) return;

    startTransition(async () => {
      try {
        console.log('Updating category:', {
          id: editingCategory.id,
          name: editingCategory.name.trim(),
          color: editingCategory.color,
        });

        const result = await updateCategory({
          id: editingCategory.id,
          name: editingCategory.name.trim(),
          color: editingCategory.color,
        });

        console.log('Update category result:', result);

        if (result.success) {
          setEditingCategory(null);
          router.refresh();
          console.log('Category updated successfully!');
        } else {
          console.error(`Failed to update category: ${result.message}`);
        }
      } catch (error) {
        console.error('Failed to update category:', error);
        console.error('An error occurred while updating the category.');
      }
    });
  }, [editingCategory, router]);

  // Handle deleting a category
  const handleDeleteCategory = useCallback(async (categoryId?: string) => {
    // Use the provided categoryId or fall back to the state value
    const idToDelete = categoryId || categoryToDelete;
    console.log('handleDeleteCategory called with categoryId:', idToDelete);

    if (!idToDelete) {
      console.error('No category to delete');
      return;
    }

    startTransition(async () => {
      try {
        console.log('Deleting category with ID:', idToDelete);

        // Call the server action directly with the ID
        const result = await deleteCategory(idToDelete);

        console.log('Delete category result:', result);

        if (result.success) {
          setCategoryToDelete(null);
          router.refresh();
          console.log('Category deleted successfully!');
        } else {
          console.error(`Failed to delete category: ${result.message}`);
        }
      } catch (error) {
        console.error('Failed to delete category:', error);
        console.error('An error occurred while deleting the category.');
      }
    });
  }, [categoryToDelete, router]);

  // Memoized handlers for edit mode
  const handleEditNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        name: e.target.value,
      });
    }
  }, [editingCategory]);

  const handleEditColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingCategory) {
      setEditingCategory({
        ...editingCategory,
        color: e.target.value,
      });
    }
  }, [editingCategory]);

  const handleCancelEdit = useCallback(() => {
    setEditingCategory(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Add New Category Form */}
      <div className="p-4 border rounded-md">
        <h3 className="text-lg font-medium mb-4">Add New Category</h3>
        <div className="flex gap-3">
          <div className="flex-grow">
            <Input
              placeholder="Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <Input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="w-12 h-10 p-1"
              disabled={isPending}
            />
          </div>
          <Button
            onClick={handleCreateCategory}
            disabled={!isCreateFormValid || isPending}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Existing Categories</h3>
        {categories.length === 0 ? (
          <p className="text-muted-foreground">No categories found. Create one above.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-md"
              >
                {editingCategory?.id === category.id ? (
                  // Edit Mode
                  <div className="flex items-center gap-3 w-full">
                    <Input
                      value={editingCategory.name}
                      onChange={handleEditNameChange}
                      className="flex-grow"
                      disabled={isPending}
                    />
                    <Input
                      type="color"
                      value={editingCategory.color}
                      onChange={handleEditColorChange}
                      className="w-12 h-10 p-1"
                      disabled={isPending}
                    />
                    <Button
                      size="icon"
                      onClick={handleUpdateCategory}
                      disabled={!isEditFormValid || isPending}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-center">
                      <div
                        className="w-5 h-5 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingCategory(category)}
                        disabled={isPending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the category "{category.name}"? This action cannot be undone.
                              Goals associated with this category will need to be reassigned.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                console.log('Delete button clicked for category:', category.id);
                                // Call handleDeleteCategory directly with the category ID
                                handleDeleteCategory(category.id);
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {onClose && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Done</Button>
        </div>
      )}
    </div>
  );
}

export const CategoryManager = React.memo(CategoryManagerComponent);
