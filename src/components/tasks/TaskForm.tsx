'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation'; // Import useRouter
import { CreateTaskSchema, CreateTaskInput, UpdateTaskSchema, UpdateTaskInput } from '@/lib/schemas/tasks'; // Import UpdateTaskSchema
import { createTask, updateTask } from '@/actions/tasks';
import { Goal, TaskPriority, Task, TaskStatus, RecurrencePattern, Category } from '@prisma/client';
import { cn } from "@/lib/utils";
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { z } from 'zod';
import { ReminderComprehensiveDropdown } from '@/components/reminders/ReminderGoalDropdown';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CalendarIcon, ChevronDown, Copy } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { AutoCloseDateTimePicker } from '@/components/ui/AutoCloseDateTimePicker';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TaskFormProps {
  initialData?: Task | null;
  goals?: Goal[];
  categories?: Category[];
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
  onTaskCreated?: (newTask: Task) => void;
}

// Let react-hook-form infer the type from defaultValues
// Use CreateTaskInput as the base for defaultValues structure
export function TaskForm({
  initialData,
  goals = [],
  categories = [],
  onFormSubmitSuccess,
  onCancel,
  onTaskCreated,
}: TaskFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const router = useRouter(); // Get router instance
  const isEditing = !!initialData?.id;

  // Duplication state
  const [isDuplicationOpen, setIsDuplicationOpen] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(1);
  const [duplicateInterval, setDuplicateInterval] = useState<RecurrencePattern>(RecurrencePattern.DAILY);

  const form = useForm({ // Let RHF infer the type
    resolver: zodResolver(CreateTaskSchema), // Use base schema for validation
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description ?? "", // Use ?? for potentially null description
      priority: initialData?.priority || TaskPriority.MEDIUM,
      dueDate: initialData?.dueDate && !isNaN(new Date(initialData.dueDate).getTime()) ? new Date(initialData.dueDate) : null, // Ensure initial date is valid before using
      goalId: initialData?.goalId ?? "__NONE__", // Use "__NONE__" for no goal
      status: initialData?.status || TaskStatus.TODO,
      recurrencePattern: initialData?.recurrencePattern || RecurrencePattern.NONE,
      recurrenceEndDate: initialData?.recurrenceEndDate ? new Date(initialData.recurrenceEndDate) : null,
    },
  });

  // Add state for category selection (for UI only, not submitted)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
    initialData?.goal?.categoryId || undefined
  );

  // Helper function to calculate next date based on interval
  const getNextDate = (baseDate: Date, interval: RecurrencePattern, increment: number): Date => {
    switch (interval) {
      case RecurrencePattern.DAILY:
        return addDays(baseDate, increment);
      case RecurrencePattern.WEEKLY:
        return addWeeks(baseDate, increment);
      case RecurrencePattern.BIWEEKLY:
        return addWeeks(baseDate, increment * 2);
      case RecurrencePattern.MONTHLY:
        return addMonths(baseDate, increment);
      case RecurrencePattern.YEARLY:
        return addYears(baseDate, increment);
      case RecurrencePattern.WEEKDAYS:
        // For weekdays, we'll add days but skip weekends
        let nextDate = baseDate;
        let daysAdded = 0;
        while (daysAdded < increment) {
          nextDate = addDays(nextDate, 1);
          // Skip weekends (Saturday = 6, Sunday = 0)
          if (nextDate.getDay() !== 0 && nextDate.getDay() !== 6) {
            daysAdded++;
          }
        }
        return nextDate;
      default:
        return addDays(baseDate, increment);
    }
  };

  // Use 'any' for values initially, perform validation inside
  const processSubmit = (values: any) => {
    setError(null);

    startTransition(async () => {
      let result: { success: boolean; message: string; };

      try {
        if (isEditing && initialData?.id) {
          // Prepare update payload
          const updatePayload = {
            id: initialData.id,
            name: values.name,
            description: values.description,
            priority: values.priority,
            dueDate: values.dueDate,
            goalId: values.goalId === "__NONE__" ? null : values.goalId, // Convert "__NONE__" to null
            // Include other fields if they are part of UpdateTaskSchema
            // status: values.status,
            // recurrencePattern: values.recurrencePattern,
            // recurrenceEndDate: values.recurrenceEndDate,
          };
          // Validate the payload against UpdateTaskSchema before sending
          const validatedUpdateData = UpdateTaskSchema.parse(updatePayload);
          result = await updateTask(validatedUpdateData);

        } else {
          // Prepare create payload
           // Check if goalId is required (implicitly, as it's not optional in CreateTaskSchema)
           // and if the placeholder value is selected.
           if (values.goalId === "__NONE__") {
               form.setError('goalId', { type: 'manual', message: 'A goal association is required.' });
               return; // Stop if goalId is required but "__NONE__" is selected
           }

          // Create multiple tasks if duplication is enabled
          const tasksToCreate = [];
          const baseDate = values.dueDate || new Date();

          for (let i = 0; i < duplicateCount; i++) {
            const taskDate = i === 0 ? values.dueDate : getNextDate(baseDate, duplicateInterval, i);
            const taskName = duplicateCount > 1 ? `${values.name} ${i + 1}` : values.name;

            const createPayload = {
              name: taskName,
              description: values.description,
              priority: values.priority,
              dueDate: taskDate,
              goalId: values.goalId, // Already validated non-empty
              status: values.status,
              recurrencePattern: values.recurrencePattern,
              recurrenceEndDate: values.recurrenceEndDate,
            };

            // Validate the payload against CreateTaskSchema before adding
            const validatedCreateData = CreateTaskSchema.parse(createPayload);
            tasksToCreate.push(validatedCreateData);
          }

          // Create all tasks
          const results = await Promise.all(
            tasksToCreate.map(taskData => createTask(taskData))
          );

          // Check if all tasks were created successfully
          const failedTasks = results.filter(r => !r.success);
          if (failedTasks.length > 0) {
            result = {
              success: false,
              message: `Failed to create ${failedTasks.length} of ${duplicateCount} tasks.`
            };
          } else {
            result = {
              success: true,
              message: `Successfully created ${duplicateCount} task${duplicateCount > 1 ? 's' : ''}.`,
              data: results[0].data // Return the first task for callback
            };
          }
        }

        if (!result.success) {
          setError(result.message || (isEditing ? "Failed to update task." : "Failed to create task."));
        } else {
          // For task creation, call the onTaskCreated callback if provided
          if (!isEditing && result.data && typeof onTaskCreated === 'function') {
            onTaskCreated(result.data);
          }

          router.refresh(); // Refresh data on success
          onFormSubmitSuccess(); // Call original success handler (e.g., close modal)
        }
      } catch (validationError) {
         if (validationError instanceof z.ZodError) {
             console.error("Zod validation failed:", validationError.errors);
             setError("Please check the form for errors.");
             validationError.errors.forEach(err => {
                 if (err.path.length > 0) {
                     // Need to cast path item to keyof form values type if possible, or use 'any'
                     form.setError(err.path[0] as any, { message: err.message });
                 }
             });
         } else {
             setError(isEditing ? "Failed to update task." : "Failed to create task.");
             console.error("Error submitting form:", validationError);
         }
      }
    });
  };

  return (
    <Form {...form}>
      {/* Let RHF handle the submit type */}
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-6" onClick={(e) => e.stopPropagation()}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter task name..." {...field} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Add task details..." {...field} value={field.value ?? ''} disabled={isPending} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                    <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-2">
                <FormLabel>Due Date & Time (Optional)</FormLabel>
                 <Popover modal={true} open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal h-10",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isPending}
                        >
                          {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? (
                            // Only format if it's a valid Date object
                            format(field.value, "PPP h:mm a") // Use 12-hour format here too
                          ) : (
                            <span>Pick a date and time</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                       <AutoCloseDateTimePicker
                         // Ensure value passed is Date | null
                         value={field.value instanceof Date ? field.value : null}
                         onChange={field.onChange} // RHF onChange should handle Date | null
                         onTimeSelected={() => setIsDatePickerOpen(false)}
                       />
                    </PopoverContent>
                  </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Category/Goal Selection Field */}
        <FormField
          control={form.control}
          name="goalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Associate with Goal {isEditing ? '(Optional)' : ''}</FormLabel>
              <ReminderComprehensiveDropdown
                categories={categories}
                goals={goals}
                selectedCategoryId={selectedCategoryId}
                selectedGoalId={field.value === "__NONE__" ? undefined : field.value}
                onSelectionChange={(selection) => {
                  if (selection.type === 'clear') {
                    setSelectedCategoryId(undefined);
                    field.onChange("__NONE__");
                  } else if (selection.type === 'category') {
                    // Prevent category selection - do nothing
                    return;
                  } else if (selection.type === 'goal') {
                    field.onChange(selection.id);
                    // Auto-populate category from goal
                    const selectedGoal = (goals || []).find(g => g.id === selection.id);
                    if (selectedGoal?.categoryId) {
                      setSelectedCategoryId(selectedGoal.categoryId);
                    }
                  }
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hidden fields for status and recurrencePattern if needed by schema but not UI */}
        {/* These might not be necessary if defaults are handled correctly by schema/action */}
        {/* <input type="hidden" {...form.register("status")} /> */}
        {/* <input type="hidden" {...form.register("recurrencePattern")} /> */}

        {/* Duplication Section - Only show for new tasks */}
        {!isEditing && (
          <Collapsible open={isDuplicationOpen} onOpenChange={setIsDuplicationOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                disabled={isPending}
              >
                <div className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Create Multiple Tasks
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isDuplicationOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duplicateCount">Number of Tasks</Label>
                  <Select
                    value={duplicateCount.toString()}
                    onValueChange={(value) => setDuplicateCount(parseInt(value))}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duplicateInterval">Interval</Label>
                  <Select
                    value={duplicateInterval}
                    onValueChange={(value) => setDuplicateInterval(value as RecurrencePattern)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RecurrencePattern.DAILY}>Daily</SelectItem>
                      <SelectItem value={RecurrencePattern.WEEKDAYS}>Weekdays Only</SelectItem>
                      <SelectItem value={RecurrencePattern.WEEKLY}>Weekly</SelectItem>
                      <SelectItem value={RecurrencePattern.BIWEEKLY}>Bi-weekly</SelectItem>
                      <SelectItem value={RecurrencePattern.MONTHLY}>Monthly</SelectItem>
                      <SelectItem value={RecurrencePattern.YEARLY}>Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {duplicateCount > 1 && (
                  <p>
                    This will create {duplicateCount} tasks with names like "{form.watch("name")} 1", "{form.watch("name")} 2", etc.
                    {form.watch("dueDate") && (
                      <span> starting from the selected date.</span>
                    )}
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="px-6">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className={!isEditing ? "bg-cyan-500/20 hover:bg-cyan-500/30 dark:bg-cyan-400/20 dark:hover:bg-cyan-400/30 border-2 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-all duration-200 hover:scale-105 hover:shadow-lg px-6" : "bg-primary hover:bg-primary/90 text-primary-foreground px-6"}
          >
            {isPending ? "Saving..." : (isEditing ? "Save Changes" : "Create Task")}
          </Button>
        </div>
      </form>
    </Form>
  );
}