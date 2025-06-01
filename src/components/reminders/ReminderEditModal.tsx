'use client';

import React, { useState, useEffect } from 'react';
import { Category, Goal, Reminder } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReminders } from '@/contexts/ReminderContext';
import { ReminderForm } from '@/components/reminders/ReminderForm';
import { getGoalsAndTasks } from '@/actions/getGoalsAndTasks';

interface ReminderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder;
}

export function ReminderEditModal({ isOpen, onClose, reminder }: ReminderEditModalProps) {
  const { refreshReminders } = useReminders();
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories and goals when the modal is opened
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const result = await getGoalsAndTasks();
          if (result.success) {
            setCategories(result.categories);
            setGoals(result.goals);
            console.log('Fetched categories:', result.categories.length);
            console.log('Fetched goals:', result.goals.length);
          }
        } catch (error) {
          console.error('Error fetching categories and goals:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }
  }, [isOpen]);

  const handleFormSuccess = async () => {
    // Close the modal
    onClose();
    // Refresh reminders to ensure consistency
    await refreshReminders();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Reminder</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ReminderForm
            initialData={reminder}
            categories={categories}
            goals={goals}
            onFormSubmitSuccess={handleFormSuccess}
            onCancel={onClose}
            isEditing={true}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
