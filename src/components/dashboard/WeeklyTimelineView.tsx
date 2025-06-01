'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Task } from '@/types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { VirtualizedTimelineWrapper } from './VirtualizedTimelineWrapper';
import { TimelineErrorBoundary } from './TimelineErrorBoundary';

interface WeeklyTimelineViewProps {
  tasks: Task[]; // Pass tasks relevant to the timeline
  onTaskClick?: (task: Task) => void;
}

// Helper function to get the days of the current week (Mon-Sun)
const getWeekDays = () => {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
  const end = endOfWeek(today, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
};

export function WeeklyTimelineView({ tasks, onTaskClick }: WeeklyTimelineViewProps) {
  const weekDays = getWeekDays();
  const today = new Date();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Filter tasks to only include those in the current week
  const weeklyTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      try {
        const dueDate = new Date(task.dueDate);
        return dueDate >= weekDays[0] && dueDate <= weekDays[6];
      } catch (e) {
        console.error("Error processing task due date:", e, task);
        return false;
      }
    });
  }, [tasks, weekDays]);

  // Group tasks by due date (only for the current week)
  const tasksByDay = useMemo(() => {
    return weeklyTasks.reduce((acc, task) => {
      if (task.dueDate) {
        try {
          const dueDate = new Date(task.dueDate);
          const dayKey = format(dueDate, 'yyyy-MM-dd');

          if (!acc[dayKey]) {
            acc[dayKey] = [];
          }
          acc[dayKey].push(task);
        } catch (e) {
          console.error("Error processing task due date:", e, task);
        }
      }
      return acc;
    }, {} as Record<string, Task[]>);
  }, [weeklyTasks]);

  // Handle day selection
  const handleDayClick = useCallback((dayKey: string) => {
    setSelectedDay(dayKey === selectedDay ? null : dayKey);
  }, [selectedDay]);

  return (
    <TimelineErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>Weekly Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-500 border-b pb-2 mb-2">
            {weekDays.map(day => (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={cn(
                  "cursor-pointer hover:bg-gray-100 rounded-md px-1 py-0.5 transition-colors",
                  isSameDay(day, today) && 'font-bold text-blue-600',
                  selectedDay === format(day, 'yyyy-MM-dd') && 'bg-primary/10'
                )}
                onClick={() => handleDayClick(format(day, 'yyyy-MM-dd'))}
              >
                <p>{format(day, 'EEE')}</p>
                <p>{format(day, 'd')}</p>
              </div>
            ))}
          </div>

          {/* Virtualized Timeline Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay[dayKey] || [];
              const isSelected = selectedDay === dayKey;

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "border-l first:border-l-0 pl-1 pt-1 min-h-[200px]",
                    isSelected && "bg-primary/5 rounded-md"
                  )}
                >
                  {dayTasks.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                      No tasks
                    </div>
                  ) : (
                    <VirtualizedTimelineWrapper
                      tasks={dayTasks}
                      height={200}
                      width="100%"
                      itemHeight={40}
                      onTaskClick={onTaskClick}
                      variableHeight={true}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TimelineErrorBoundary>
  );
}

export default React.memo(WeeklyTimelineView);
