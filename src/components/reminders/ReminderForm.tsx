'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReminderFormValidation, ReminderFormValues } from '@/lib/schemas/reminders';
import { Goal, Task, Reminder, Category } from '@/types';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReminders } from '@/contexts/ReminderContext';
import { ReminderComprehensiveDropdown } from './ReminderGoalDropdown';
import { EnhancedRecurrenceForm } from './EnhancedRecurrenceForm';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditableSingleClickDateTimePicker } from '@/components/ui/EditableSingleClickDateTimePicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ReminderFormProps {
  initialData?: Reminder;
  categories?: Category[];
  goals?: Goal[];
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export function ReminderForm({
  initialData,
  categories = [],
  goals = [],
  onFormSubmitSuccess,
  onCancel,
  isEditing = false
}: ReminderFormProps) {
  const { addReminder, updateReminder, isLoading } = useReminders();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [recurrenceAction, setRecurrenceAction] = useState<'keep' | 'change' | 'end' | 'delete'>('keep');
  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(ReminderFormValidation),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(),
      isRecurring: initialData?.isRecurring || false,
      recurrence: initialData?.recurrence || '',

      // Enhanced recurrence fields
      recurrenceEndDate: initialData?.recurrenceEndDate ? new Date(initialData.recurrenceEndDate) : undefined,
      maxOccurrences: initialData?.maxOccurrences || undefined,
      recurrenceInterval: initialData?.recurrenceInterval || 1,
      weeklyDays: initialData?.weeklyDays || '',
      monthlyType: (initialData?.monthlyType as any) || 'date',
      monthlyWeekday: initialData?.monthlyWeekday || undefined,
      monthlyWeekNumber: initialData?.monthlyWeekNumber || undefined,
      terminationType: (initialData?.recurrenceEndDate ? 'on' :
                       initialData?.maxOccurrences ? 'after' : 'never') as any,

      categoryId: initialData?.categoryId || undefined,
      goalId: initialData?.goalId || undefined,
    },
  });

  // Update form values when recurrence action changes
  useEffect(() => {
    if (isEditing && initialData?.isRecurring) {
      if (recurrenceAction === 'end') {
        // Set isRecurring to false when ending recurrence
        form.setValue('isRecurring', false);
      } else if (recurrenceAction === 'keep') {
        // Restore original values
        form.setValue('isRecurring', initialData.isRecurring);
        form.setValue('recurrence', initialData.recurrence || '');
      }
    }
  }, [recurrenceAction, isEditing, initialData, form]);

  const onSubmit = async (data: ReminderFormValues) => {
    setIsSubmitting(true);
    try {
      let result;

      if (isEditing && initialData) {
        // Handle recurrence actions for existing recurring reminders
        let updatedData = { ...data };

        if (initialData.isRecurring) {
          switch (recurrenceAction) {
            case 'keep':
              // Keep the existing recurrence settings
              break;
            case 'change':
              // Use the new recurrence settings from the form
              break;
            case 'end':
              // End the recurrence by setting isRecurring to false
              updatedData.isRecurring = false;
              updatedData.recurrence = null;
              break;
            case 'delete':
              // This will be handled by a separate delete action
              // For now, just update the reminder
              break;
          }
        }

        // Update existing reminder
        result = await updateReminder(initialData.id, {
          ...updatedData,
          status: initialData.status,
          updatedAt: new Date(),
        });
      } else {
        // Create new reminder
        result = await addReminder(data);
      }

      if (result.success) {
        console.log(isEditing
          ? "Your reminder has been updated successfully."
          : "Your reminder has been created successfully.");
        onFormSubmitSuccess();
      } else {
        const errorMessage = result.message || result.error?.message || `Failed to ${isEditing ? 'update' : 'create'} reminder`;
        console.error("Error with reminder:", errorMessage);
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} reminder:`, error);
      console.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Title Field */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter reminder title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter reminder details"
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Due Date Field */}
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date & Time</FormLabel>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP 'at' p")
                      ) : (
                        <span>Pick a date and time</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <EditableSingleClickDateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    onComplete={() => setDatePickerOpen(false)}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recurrence Options for Editing */}
        {isEditing && initialData?.isRecurring && (
          <div className="rounded-md border p-4 space-y-3">
            <h3 className="font-medium text-sm">Recurrence Options</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="keep-recurrence"
                  name="recurrence-action"
                  checked={recurrenceAction === 'keep'}
                  onChange={() => setRecurrenceAction('keep')}
                  className="h-4 w-4 text-primary"
                />
                <label htmlFor="keep-recurrence" className="text-sm">
                  Keep current recurrence pattern ({initialData.recurrence})
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="change-recurrence"
                  name="recurrence-action"
                  checked={recurrenceAction === 'change'}
                  onChange={() => setRecurrenceAction('change')}
                  className="h-4 w-4 text-primary"
                />
                <label htmlFor="change-recurrence" className="text-sm">
                  Change recurrence pattern
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="end-recurrence"
                  name="recurrence-action"
                  checked={recurrenceAction === 'end'}
                  onChange={() => setRecurrenceAction('end')}
                  className="h-4 w-4 text-primary"
                />
                <label htmlFor="end-recurrence" className="text-sm">
                  End recurrence (make this a one-off reminder)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Recurrence Fields */}
        {(!isEditing || !initialData?.isRecurring || recurrenceAction === 'change') && (
          <>
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Recurring Reminder</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      This reminder will repeat based on the pattern you select.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {form.watch('isRecurring') && (
              <div className="rounded-md border p-4 space-y-4">
                <h3 className="font-medium text-sm">Recurrence Configuration</h3>
                <EnhancedRecurrenceForm form={form} />
              </div>
            )}
          </>
        )}

        {/* Category/Goal Selection Field */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field: categoryField }) => (
            <FormField
              control={form.control}
              name="goalId"
              render={({ field: goalField }) => (
                <FormItem>
                  <FormLabel>Category or Goal (Optional)</FormLabel>
                  <ReminderComprehensiveDropdown
                    categories={categories}
                    goals={goals}
                    selectedCategoryId={categoryField.value}
                    selectedGoalId={goalField.value}
                    onSelectionChange={(selection) => {
                      if (selection.type === 'clear') {
                        categoryField.onChange(undefined);
                        goalField.onChange(undefined);
                      } else if (selection.type === 'category') {
                        categoryField.onChange(selection.id);
                        goalField.onChange(undefined); // Clear goal when category is selected
                      } else if (selection.type === 'goal') {
                        goalField.onChange(selection.id);
                        // Auto-populate category from goal
                        const selectedGoal = goals.find(g => g.id === selection.id);
                        if (selectedGoal?.categoryId) {
                          categoryField.onChange(selectedGoal.categoryId);
                        }
                      }
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            variant="outline"
            className="bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-black dark:bg-amber-700/30 dark:hover:bg-amber-700/50 dark:border-amber-700 dark:text-amber-300"
          >
            {isSubmitting || isLoading
              ? (isEditing ? "Updating..." : "Creating...")
              : (isEditing ? "Update Reminder" : "Create Reminder")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
