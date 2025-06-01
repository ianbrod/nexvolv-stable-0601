'use client';

import React from 'react';
import { Category, Goal } from '@prisma/client';
import { Form } from "@/components/ui/form";
import { useGoalForm } from './hooks/useGoalForm';
import { GoalFormFields } from './GoalFormFields';
import { GoalFormActions, GoalFormFooterActions } from './GoalFormActions';



// --- Component Props ---
interface GoalFormProps {
  initialData?: Goal | null;
  categories: Category[];
  tags?: string[];
  parentGoals?: Goal[]; // Add parent goals for sub-goal creation
  parentGoal?: Goal | null; // Direct parent goal reference
  isSubGoal?: boolean; // Flag to indicate if creating a sub-goal
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
  renderFooterActions?: (footerActions: React.ReactNode) => React.ReactNode; // Optional prop to render footer actions externally
}

// --- Component Definition ---
export function GoalForm({
  initialData,
  categories,
  tags = [],
  parentGoals = [],
  parentGoal = null,
  isSubGoal = false,
  onFormSubmitSuccess,
  onCancel,
  renderFooterActions,
}: GoalFormProps) {
  const {
    form,
    error,
    isPending,
    tagsString,
    setTagsString,
    isEditing,
    isCategoryDisabled,
    isSubGoalBeingEdited,
    parentGoalId,
    processSubmit
  } = useGoalForm({
    initialData,
    categories,
    parentGoals,
    parentGoal,
    isSubGoal,
    onFormSubmitSuccess,
  });





  // Create the footer actions component
  const footerActions = (
    <GoalFormFooterActions
      isEditing={isEditing}
      isPending={isPending}
      onCancel={onCancel}
      form={form}
      onSubmit={processSubmit}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-4" onClick={(e) => e.stopPropagation()}>
        <GoalFormFields
          form={form}
          categories={categories}
          parentGoals={parentGoals}
          isPending={isPending}
          isEditing={isEditing}
          isCategoryDisabled={isCategoryDisabled}
          isSubGoalBeingEdited={isSubGoalBeingEdited}
          parentGoalId={parentGoalId}
          tagsString={tagsString}
          setTagsString={setTagsString}
        />

        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}

        <GoalFormActions
          isEditing={isEditing}
          isPending={isPending}
          initialData={initialData}
          onCancel={onCancel}
          onFormSubmitSuccess={onFormSubmitSuccess}
          form={form}
        />

        {/* Render footer actions inline if no external renderer is provided */}
        {!renderFooterActions && (
          <div className="pt-4">
            {footerActions}
          </div>
        )}
      </form>

      {/* Call external footer renderer if provided */}
      {renderFooterActions && renderFooterActions(footerActions)}
    </Form>
  );
}