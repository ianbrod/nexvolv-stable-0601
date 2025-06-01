'use client';

import React, { useRef, useEffect } from 'react';
import { Task } from '@prisma/client';
import { SimpleTaskItem } from './SimpleTaskItem';
import { taskHeightCache } from './TaskHeightCache';

interface TaskMeasurerProps {
  task: Task;
  goalName?: string | null;
  onMeasureComplete?: (taskId: string, height: number) => void;
}

/**
 * A component that measures the height of a task item and stores it in the cache
 */
export function TaskMeasurer({ task, goalName, onMeasureComplete }: TaskMeasurerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      // Get the height of the rendered task item
      const height = ref.current.getBoundingClientRect().height;
      
      // Store the height in the cache
      taskHeightCache.setHeight(task.id, height);
      
      // Call the callback if provided
      if (onMeasureComplete) {
        onMeasureComplete(task.id, height);
      }
    }
  }, [task, onMeasureComplete]);

  return (
    <div ref={ref} style={{ position: 'absolute', visibility: 'hidden', width: '100%' }}>
      <SimpleTaskItem
        task={task}
        goalName={goalName}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}

/**
 * A component that measures multiple task items
 */
export function BatchTaskMeasurer({ 
  tasks, 
  getGoalName,
  onAllMeasurementsComplete 
}: { 
  tasks: Task[]; 
  getGoalName: (goalId: string | null) => string | null;
  onAllMeasurementsComplete?: () => void;
}) {
  const [measuredCount, setMeasuredCount] = React.useState(0);
  
  useEffect(() => {
    if (measuredCount === tasks.length && onAllMeasurementsComplete) {
      onAllMeasurementsComplete();
    }
  }, [measuredCount, tasks.length, onAllMeasurementsComplete]);

  const handleMeasureComplete = () => {
    setMeasuredCount(prev => prev + 1);
  };

  return (
    <div style={{ position: 'absolute', visibility: 'hidden', width: '100%' }}>
      {tasks.map(task => (
        <TaskMeasurer
          key={task.id}
          task={task}
          goalName={getGoalName(task.goalId)}
          onMeasureComplete={() => handleMeasureComplete()}
        />
      ))}
    </div>
  );
}
