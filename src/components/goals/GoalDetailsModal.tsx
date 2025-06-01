'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, Clock, ListTodo } from 'lucide-react';
import { GoalCardData, CategoryData } from './types';

interface GoalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalCardData | null;
  categories?: CategoryData[];
}

export function GoalDetailsModal({ isOpen, onClose, goal }: GoalDetailsModalProps) {
  if (!goal) return null;

  // Calculate progress percentage
  const totalTasks = goal.tasks.length;
  const completedTasks = goal.completedTaskCount;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;



  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            {goal.name}
            {goal.parentGoalId && (
              <Badge variant="outline" className="ml-2 text-xs">
                Sub-Goal
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category */}
          {goal.category && (
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: goal.category.color || '#808080' }}
              />
              <span className="text-sm font-medium">{goal.category.name}</span>
            </div>
          )}

          {/* Tags */}
          {goal.tags && (
            <div className="mt-2">
              <h4 className="text-sm font-semibold mb-1">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {goal.tags.split(',').filter(Boolean).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {goal.description && (
            <div className="mt-2">
              <h4 className="text-sm font-semibold mb-1">Description</h4>
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            </div>
          )}

          <Separator />

          {/* Progress */}
          <div>
            <h4 className="text-sm font-semibold mb-1 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" /> Progress
            </h4>
            <div className="w-full bg-muted rounded-full h-2.5 mb-1">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} of {totalTasks} tasks completed ({progressPercentage}%)
            </p>
          </div>

          {/* Deadline */}
          {goal.deadline && (
            <div>
              <h4 className="text-sm font-semibold mb-1 flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" /> Deadline
              </h4>
              <p className="text-sm">{format(new Date(goal.deadline), 'PPP')}</p>
            </div>
          )}

          {/* Sub-goals */}
          {!goal.parentGoalId && goal.subGoalCount > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-1 flex items-center">
                <ListTodo className="h-4 w-4 mr-1" /> Sub-Goals
              </h4>
              <p className="text-sm">{goal.subGoalCount} sub-goal{goal.subGoalCount !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Created & Updated */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" /> Created
              </h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(goal.createdAt), 'PPP')}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" /> Updated
              </h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(goal.updatedAt), 'PPP')}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end items-center">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
