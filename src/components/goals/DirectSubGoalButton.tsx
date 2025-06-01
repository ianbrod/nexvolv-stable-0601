'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Category, Goal } from '@prisma/client';

interface DirectSubGoalButtonProps {
  parentGoal: Goal;
  onSuccess?: () => void;
}

export function DirectSubGoalButton({ parentGoal, onSuccess }: DirectSubGoalButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleOpenModal = (e: React.MouseEvent) => {
    // Prevent event propagation to parent components
    e.stopPropagation();
    e.preventDefault();

    // Set a small timeout to ensure any parent modal events are processed first
    setTimeout(() => {
      setIsOpen(true);
    }, 50);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    // Reset form
    setName('');
    setDescription('');
    setDeadline('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      setIsSubmitting(true);

      console.log('Submitting sub-goal with data:', {
        name,
        description,
        deadline,
        parentGoalId: parentGoal.id
      });

      const response = await fetch('/api/goals/sub-goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || null,
          deadline: deadline || null,
          parentGoalId: parentGoal.id
        }),
      });

      const data = await response.json();
      console.log('API response:', data);

      if (data.success) {
        console.log('Sub-goal created successfully');

        handleCloseModal();

        // Store the parent goal ID in localStorage to ensure it's expanded after refresh
        localStorage.setItem('expandedGoalId', parentGoal.id);
        console.log('Stored expandedGoalId in localStorage:', parentGoal.id);

        // Call the success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        // Use router.refresh() instead of window.location.reload()
        router.refresh();
      } else {
        alert(data.message || "Failed to create sub-goal");
      }
    } catch (error) {
      console.error('Error creating sub-goal:', error);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        size="sm"
        className="h-8"
        // Add data attribute for testing
        data-testid="add-sub-goal-button"
      >
        <Plus className="h-4 w-4 mr-1" /> Add Sub-Goal
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          // Only close the modal when explicitly requested
          if (!open) setIsOpen(false);
        }}
        // Add a class for styling and identification
        className="direct-sub-goal-modal"
      >
        <DialogContent
          className="sm:max-w-[525px]"
          // Prevent clicks inside the dialog from closing parent dialogs
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          // Add data attribute for sub-goal modal
          data-subgoal-modal="true"
        >
          <DialogHeader>
            <DialogTitle>Create Sub-Goal</DialogTitle>
            <DialogDescription>
              Create a sub-goal for "{parentGoal.name}"
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter sub-goal name"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => {
                    console.log('Date changed:', e.target.value);
                    setDeadline(e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-cyan-500/20 hover:bg-cyan-500/30 dark:bg-cyan-400/20 dark:hover:bg-cyan-400/30 border-2 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                onClick={(e) => {
                  // Ensure the form submission happens
                  if (!name.trim()) {
                    e.preventDefault();
                    alert("Name is required");
                    return;
                  }
                }}
              >
                {isSubmitting ? 'Creating...' : 'Create Sub-Goal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
