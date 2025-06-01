import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Category, Goal } from '@prisma/client';
import { GoalFormInput, GoalFormSchema } from '@/lib/schemas/goals';
import { createGoal, updateGoal } from '@/actions/goals';

interface UseGoalFormProps {
  initialData?: Goal | null;
  categories: Category[];
  parentGoals?: Goal[];
  parentGoal?: Goal | null;
  isSubGoal?: boolean;
  onFormSubmitSuccess: () => void;
}

export function useGoalForm({
  initialData,
  categories,
  parentGoals = [],
  parentGoal = null,
  isSubGoal = false,
  onFormSubmitSuccess,
}: UseGoalFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isPending, setIsPending] = useState(false);
  const [tagsString, setTagsString] = useState('');

  const isEditing = !!initialData;
  const isSubGoalBeingEdited = isEditing && !!initialData?.parentGoalId;

  // Determine parent goal ID
  const parentGoalId = useMemo(() => {
    if (parentGoal) return parentGoal.id;
    if (initialData?.parentGoalId) return initialData.parentGoalId;
    return null;
  }, [parentGoal, initialData?.parentGoalId]);

  // Determine if category should be disabled
  const isCategoryDisabled = useMemo(() => {
    return isSubGoal || isSubGoalBeingEdited;
  }, [isSubGoal, isSubGoalBeingEdited]);

  // Set up form with default values
  const form = useForm<GoalFormInput>({
    resolver: zodResolver(GoalFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      categoryId: initialData?.categoryId || parentGoal?.categoryId || '',
      parentGoalId: parentGoalId || undefined,
      deadline: initialData?.deadline ? new Date(initialData.deadline) : undefined,
      timeframe: initialData?.timeframe || undefined,
      progress: initialData?.progress || 0,
    },
  });



  // Initialize tags string from initial data
  useEffect(() => {
    if (initialData?.tags) {
      setTagsString(typeof initialData.tags === 'string' ? initialData.tags : '');
    }
  }, [initialData?.tags]);

  // Set category from parent goal when creating sub-goal
  useEffect(() => {
    if ((isSubGoal || isSubGoalBeingEdited) && parentGoal?.categoryId) {
      form.setValue('categoryId', parentGoal.categoryId);
    }
  }, [isSubGoal, isSubGoalBeingEdited, parentGoal?.categoryId, form]);

  const processSubmit = async (data: GoalFormInput) => {
    console.log('processSubmit called with data:', data);
    try {
      setIsPending(true);
      setError('');

      // Prepare the data for submission
      const submitData = {
        ...data,
        tags: tagsString.trim() ? tagsString.trim().split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        parentGoalId: parentGoalId || null,
      };

      console.log('Submit data prepared:', submitData);
      console.log('Is editing:', isEditing, 'Initial data:', initialData);

      let result;
      if (isEditing && initialData) {
        // Include the ID in the submit data for updates
        const updateData = {
          ...submitData,
          id: initialData.id,
        };
        console.log('Calling updateGoal with:', updateData);
        result = await updateGoal(updateData);
      } else {
        console.log('Calling createGoal with:', submitData);
        result = await createGoal(submitData);
      }

      console.log('Action result:', result);

      if (result.success) {
        console.log(`Goal "${data.name}" has been ${isEditing ? 'updated' : 'created'} successfully.`);

        // Refresh the page to ensure the new goal appears in the UI
        console.log('Refreshing page to show updated goals...');
        router.refresh();

        // Call the success callback (which will close the modal)
        onFormSubmitSuccess();
      } else {
        const errorMessage = result.message || result.error?.message || 'An error occurred while saving the goal.';
        setError(errorMessage);
        console.error('Error saving goal:', errorMessage);
      }
    } catch (error) {
      console.error('Error submitting goal form:', error);
      setError('An unexpected error occurred.');
      console.error('An unexpected error occurred while saving the goal.');
    } finally {
      setIsPending(false);
    }
  };

  return {
    form,
    error,
    isPending,
    tagsString,
    setTagsString,
    isEditing,
    isCategoryDisabled,
    isSubGoalBeingEdited,
    parentGoalId,
    processSubmit,
  };
}
