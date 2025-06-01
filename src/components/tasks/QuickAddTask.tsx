'use client';

import React, { useState, useTransition } from 'react';
import { Goal, TaskPriority } from '@prisma/client';
import { createTask } from '@/actions/tasks';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DateTimePicker'; // Import DateTimePicker

interface QuickAddTaskProps {
  goals: Goal[];
}

export function QuickAddTask({ goals }: QuickAddTaskProps) {
  const router = useRouter();
  const [taskName, setTaskName] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // Add state for date
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [blurError, setBlurError] = useState<string | null>(null);

  // Filter goals to show only top-level goals (exclude sub-goals) and sort by category order
  const topLevelGoals = goals
    .filter(goal => !goal.parentGoalId)
    .sort((a, b) => {
      // First sort by category order (if categories exist)
      const categoryOrderA = a.category?.order ?? Number.MAX_SAFE_INTEGER;
      const categoryOrderB = b.category?.order ?? Number.MAX_SAFE_INTEGER;

      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }

      // Then sort by goal order within the same category
      const goalOrderA = (a as any).order ?? Number.MAX_SAFE_INTEGER;
      const goalOrderB = (b as any).order ?? Number.MAX_SAFE_INTEGER;

      return goalOrderA - goalOrderB;
    });

  // Handle input blur for validation
  const handleInputBlur = () => {
    setHasBlurred(true);

    // Validate on blur
    if (taskName.trim().length > 0 && taskName.trim().length < 3) {
      setBlurError("Task name must be at least 3 characters.");
    } else {
      setBlurError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous errors
    setError(null);

    // Client-side validation for task name length
    if (!taskName.trim()) return;
    if (taskName.trim().length < 3) {
      setError("Task name must be at least 3 characters.");
      return;
    }
    if (!selectedGoalId) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', taskName);
      formData.append('goalId', selectedGoalId);
      formData.append('priority', TaskPriority.MEDIUM); // Default priority
      if (selectedDate) {
        formData.append('dueDate', selectedDate.toISOString()); // Add dueDate if selected
      }

      const result = await createTask(formData);

      if (result.success) {
        setTaskName('');
        setSelectedGoalId(''); // Reset goal selection
        setSelectedDate(undefined); // Reset date selection
        setHasBlurred(false);
        setBlurError(null);
        router.refresh();
      } else {
        // Display the error message in the UI
        setError(result.message || 'Failed to create task');
        // Remove the console.error that's causing the error in the browser console
      }
    });
  };

  const handleDateChange = (newDate: Date | null) => {
    setSelectedDate(newDate ?? undefined); // Convert null to undefined for the state setter
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Quick Add"
              value={taskName}
              onChange={(e) => {
                setTaskName(e.target.value);
                // Clear form submission error when user starts typing again
                if (error) setError(null);
                // Note: We keep the blur error state so red border persists until next blur
              }}
              onBlur={handleInputBlur}
              className={`flex-grow ${hasBlurred && blurError ? 'border-destructive' : ''}`}
              disabled={isPending}
              minLength={3}
            />
            <Select
              value={selectedGoalId}
              onValueChange={setSelectedGoalId}
              disabled={isPending}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a goal" />
              </SelectTrigger>
              <SelectContent>
                {topLevelGoals.map((goal) => (
                  <SelectItem
                    key={goal.id}
                    value={goal.id}
                    className="flex items-center"
                    data-dropdown-type="goal"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: goal.category?.color || '#808080' }}
                      />
                      <span className="font-medium">{goal.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateTimePicker value={selectedDate} onChange={handleDateChange} /> {/* Use the handler function */}
            <Button
              type="submit"
              disabled={isPending || !taskName.trim() || !selectedGoalId}
              className="bg-green-500/15 hover:bg-green-500/25 dark:bg-green-400/15 dark:hover:bg-green-400/25 border-2 border-green-500/60 dark:border-green-400/60 text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 transition-all duration-200"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Display error message - only show form submission errors, not blur errors */}
          {error && (
            <div className="text-sm font-medium text-destructive mt-2">
              {error}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
