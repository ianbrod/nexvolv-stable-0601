'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Category, Goal } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bell } from 'lucide-react';
import { useReminders } from '@/contexts/ReminderContext';
import { ReminderForm } from '@/components/reminders/ReminderForm';
import { getGoalsAndTasks } from '@/actions/getGoalsAndTasks';

interface ReminderModalProps {
  iconOnly?: boolean;
}

export function ReminderModal({ iconOnly = false }: ReminderModalProps) {
  const { refreshReminders } = useReminders();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories and goals when the modal is opened
  useEffect(() => {
    if (open) {
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
  }, [open]);

  const handleFormSuccess = useCallback(async () => {
    // Close the modal
    setOpen(false);
    // Refresh reminders to ensure consistency
    await refreshReminders();
  }, [refreshReminders]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md flex items-center justify-center"
            aria-label="Open reminders"
            title="Open reminders"
          >
            <Bell className="h-7 w-7 text-amber-400 fill-amber-400" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full text-xs flex items-center justify-center border-dashed border-red-400 dark:border-red-400/65">
            <Bell className="h-7 w-7 mr-1 text-amber-400 fill-amber-400" />
            Add Reminder
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Reminder</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ReminderForm
            categories={categories}
            goals={goals}
            onFormSubmitSuccess={handleFormSuccess}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default React.memo(ReminderModal);