'use client';

import React from 'react';
import { format } from 'date-fns';

import { GoalDetailInfoProps } from './goal-detail-types';
import { GoalProgressHistory } from './GoalProgressHistory';


/**
 * Component for displaying goal description and progress
 */
export function GoalDetailInfo({ goal }: GoalDetailInfoProps) {
  // Log the progress value for debugging
  console.log(`GoalDetailInfo: goal.progress = ${goal.progress}`);

  // Use a state variable to force re-render when progress changes
  const [progressValue, setProgressValue] = React.useState(goal.progress);
  const [key, setKey] = React.useState(`progress-${goal.id}-${goal.progress}`);

  // Update the state when the prop changes
  React.useEffect(() => {
    if (progressValue !== goal.progress) {
      setProgressValue(goal.progress);
      setKey(`progress-${goal.id}-${goal.progress}-${Date.now()}`);
      console.log(`Updating progress key to: ${key}`);
    }
  }, [goal.progress, progressValue, goal.id, key]);

  // Force update function
  const [forceUpdateCounter, setForceUpdateCounter] = React.useState(0);

  // Force a re-render when progress changes
  React.useEffect(() => {
    // Increment counter to force re-render
    setForceUpdateCounter(prev => prev + 1);
  }, [progressValue]);

  return (
    <section className="mb-4" data-goal-info="true">
      {/* Progress History Visualization */}
      <GoalProgressHistory
        key={`${key}-${forceUpdateCounter}`}
        goalId={goal.id}
        currentProgress={progressValue}
      />
    </section>
  );
}
