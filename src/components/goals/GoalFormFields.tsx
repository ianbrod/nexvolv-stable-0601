'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Category, Goal } from '@prisma/client';
import { GoalFormInput } from '@/lib/schemas/goals';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AutoCloseDateTimePicker } from "@/components/ui/AutoCloseDateTimePicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CalendarIcon } from 'lucide-react';
import { usePopoverState } from '@/hooks/usePopoverState';
import { EnhancedTagInput } from '@/components/ui/enhanced-tag-input';
import { GoalHierarchicalDropdown } from './GoalHierarchicalDropdown';

interface GoalFormFieldsProps {
  form: UseFormReturn<GoalFormInput>;
  categories: Category[];
  parentGoals: Goal[];
  isPending: boolean;
  isEditing: boolean;
  isCategoryDisabled: boolean;
  isSubGoalBeingEdited: boolean;
  parentGoalId: string | null | undefined;
  tagsString: string;
  setTagsString: (value: string) => void;
}

export const GoalFormFields = React.memo(function GoalFormFields({
  form,
  categories,
  parentGoals,
  isPending,
  isEditing,
  isCategoryDisabled,
  isSubGoalBeingEdited,
  parentGoalId,
  tagsString,
  setTagsString,
}: GoalFormFieldsProps) {
  return (
    <>
      {/* Goal Name Field */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Goal Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter goal name..." {...field} disabled={isPending} />
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
                placeholder="Add goal details..."
                {...field}
                value={field.value ?? ''}
                disabled={isPending}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category/Parent Goal Hierarchical Field */}
      <FormField
        control={form.control}
        name="categoryId"
        render={({ field: categoryField }) => (
          <FormField
            control={form.control}
            name="parentGoalId"
            render={({ field: parentGoalField }) => (
              <FormItem>
                <FormLabel>
                  Category or Parent Goal
                  {!parentGoalField.value && !categoryField.value && !isSubGoalBeingEdited && <span className="text-destructive">*</span>}
                </FormLabel>
                <GoalHierarchicalDropdown
                  categories={categories}
                  goals={parentGoals}
                  selectedCategoryId={categoryField.value}
                  selectedGoalId={parentGoalField.value}
                  onSelectionChange={(selection) => {
                    if (selection.type === 'clear') {
                      categoryField.onChange(undefined);
                      parentGoalField.onChange(undefined);
                    } else if (selection.type === 'category') {
                      categoryField.onChange(selection.id);
                      parentGoalField.onChange(undefined); // Clear parent goal when category is selected
                    } else if (selection.type === 'goal') {
                      // When a goal is selected as parent, inherit its category
                      const selectedGoal = parentGoals.find(g => g.id === selection.id);
                      if (selectedGoal?.categoryId) {
                        categoryField.onChange(selectedGoal.categoryId);
                      }
                      parentGoalField.onChange(selection.id);
                    }
                  }}
                  disabled={isPending || isCategoryDisabled}
                />
                {!parentGoalField.value && !categoryField.value && <FormMessage />}
              </FormItem>
            )}
          />
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        {/* Deadline Field */}
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem className="flex flex-col pt-2">
              <FormLabel>Deadline (Optional)</FormLabel>
              {(() => {
                const popover = usePopoverState();
                return (
                  <Popover
                    open={popover.open}
                    onOpenChange={popover.onOpenChange}
                    modal={true}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isPending}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <AutoCloseDateTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        onTimeSelected={() => popover.setOpen(false)}
                        disabled={isPending ? () => true : undefined}
                      />
                    </PopoverContent>
                  </Popover>
                );
              })()}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Tags Field */}
      <div className="mt-4">
        <EnhancedTagInput
          value={tagsString}
          onChange={setTagsString}
          disabled={isPending}
          placeholder="Add tags (press Tab or comma to add)"
        />
      </div>
    </>
  );
});
