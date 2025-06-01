'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Goal } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { GoalForm } from './GoalForm';
import { CategoryData, GoalCardData } from './types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryData[];
  goalToEdit?: Goal | GoalCardData | null;
  parentGoal?: Goal | GoalCardData | null; // Add parent goal for sub-goal creation
  parentGoals?: GoalCardData[]; // List of potential parent goals
  isSubGoal?: boolean; // Flag to indicate if creating a sub-goal
}

export function GoalModal({
  isOpen,
  onClose,
  categories,
  goalToEdit,
  parentGoal = null,
  parentGoals = [],
  isSubGoal = false,
}: GoalModalProps) {
  const router = useRouter();

  // Add debug logging
  console.log('GoalModal render', {
    isOpen,
    isSubGoal,
    hasGoalToEdit: !!goalToEdit,
    hasParentGoal: !!parentGoal,
    parentGoalsCount: parentGoals.length
  });

  // Track modal lifecycle
  useEffect(() => {
    console.log('GoalModal isOpen changed to:', isOpen);

    // Debug cleanup
    return () => {
      console.log('GoalModal effect cleanup');
    };
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    console.log('GoalModal handleOpenChange called with:', open);
    // Only call onClose when the modal is being closed, not when it's being opened
    if (!open) {
      console.log('GoalModal calling onClose');
      onClose();
    }

    // Prevent event bubbling to parent dialogs
    if (isSubGoal) {
      // This is important to prevent the event from bubbling up to parent dialogs
      setTimeout(() => {
        const event = new Event('stopPropagation');
        document.dispatchEvent(event);
      }, 0);
    }
  };

  // Prevent event propagation to parent modals
  const handleDialogClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent closing parent modals
    e.stopPropagation();
  };

  const handleSuccess = () => {
    console.log('GoalModal handleSuccess called');
    // Close the modal
    onClose();

    // Note: Page refresh is now handled in the useGoalForm hook
    // after the server action completes successfully
  };

  const isEditing = !!goalToEdit;
  let title = isEditing ? "Edit Goal" : "Create New Goal";
  let description = isEditing
    ? "Update the details of your goal."
    : "Fill in the details for your new goal.";

  // Override title and description for sub-goals
  if (isSubGoal && !isEditing) {
    title = "Create Sub-Goal";
    description = `Create a sub-goal for "${parentGoal?.name || 'parent goal'}".`;
  }


  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      // Add a unique ID to help with debugging
      data-modal-id={isSubGoal ? 'sub-goal-modal' : (goalToEdit ? `edit-goal-${goalToEdit.id}` : 'new-goal-modal')}
      // Add a class to identify this as a sub-goal modal for styling
      className={isSubGoal ? 'sub-goal-modal' : ''}
    >
      <DialogContent
        className="sm:max-w-[525px]"
        key={goalToEdit?.id ?? 'create'}
        // Prevent clicks inside the dialog from closing parent dialogs
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        // Add data attribute for sub-goal modal
        data-subgoal-modal={isSubGoal ? 'true' : 'false'}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4">
          <GoalForm
            initialData={goalToEdit}
            categories={categories}
            parentGoals={parentGoal ? [parentGoal] : parentGoals}
            parentGoal={parentGoal}
            isSubGoal={isSubGoal}
            onFormSubmitSuccess={handleSuccess}
            onCancel={onClose}
            renderFooterActions={(footerActions) => (
              <DialogFooter className="sm:justify-end">
                {footerActions}
              </DialogFooter>
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}