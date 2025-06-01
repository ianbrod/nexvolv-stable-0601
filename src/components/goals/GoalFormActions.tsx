'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Goal } from '@prisma/client';
import { GoalFormInput } from '@/lib/schemas/goals';
import { Button } from "@/components/ui/button";
import { DirectSubGoalButton } from './DirectSubGoalButton';

interface GoalFormActionsProps {
  isEditing: boolean;
  isPending: boolean;
  initialData?: Goal | null;
  onCancel: () => void;
  onFormSubmitSuccess: () => void;
  form: UseFormReturn<GoalFormInput>;
}

// Component for rendering just the Add Sub-Goal button in the form body
export const GoalFormActions = React.memo(function GoalFormActions({
  isEditing,
  isPending,
  initialData,
  onCancel,
  onFormSubmitSuccess,
  form,
}: GoalFormActionsProps) {
  return (
    <div className="pt-4">
      {/* Add Sub-Goal button - only show when editing a top-level goal (not a sub-goal) */}
      {isEditing && initialData && !initialData.parentGoalId && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="inline-block"
        >
          <DirectSubGoalButton
            parentGoal={initialData as Goal}
            onSuccess={onFormSubmitSuccess}
          />
        </div>
      )}
    </div>
  );
});

// Component for rendering the modal footer buttons
export const GoalFormFooterActions = React.memo(function GoalFormFooterActions({
  isEditing,
  isPending,
  onCancel,
  form,
  onSubmit,
}: Omit<GoalFormActionsProps, 'initialData' | 'onFormSubmitSuccess'> & { onSubmit?: (data: any) => void }) {
  const handleSubmitClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Submit button clicked, triggering form submission...');

    if (onSubmit) {
      // Use the form's handleSubmit to get validated data and call onSubmit
      const submitHandler = form.handleSubmit(onSubmit);
      await submitHandler();
    } else {
      console.error('No onSubmit handler provided!');
    }
  };

  return (
    <div className="flex space-x-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
        Cancel
      </Button>
      <Button
        type="button"
        disabled={isPending}
        className={!isEditing ? "bg-cyan-500/20 hover:bg-cyan-500/30 dark:bg-cyan-400/20 dark:hover:bg-cyan-400/30 border-2 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-all duration-200 hover:scale-105 hover:shadow-lg" : ""}
        onClick={handleSubmitClick}
      >
        {isPending ? "Saving..." : (isEditing ? "Save Changes" : "Create Goal")}
      </Button>
    </div>
  );
});
