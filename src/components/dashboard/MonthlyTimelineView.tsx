'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  getDay
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ChunkedTimelineView } from './ChunkedTimelineView';
import { TimelineErrorBoundary } from './TimelineErrorBoundary';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthlyTimelineViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  className?: string;
}

/**
 * A timeline view that displays tasks in a monthly calendar format
 */
export function MonthlyTimelineView({
  tasks,
  onTaskClick,
  className = ''
}: MonthlyTimelineViewProps) {
  // State for current month
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Get days in the current month
  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Get day names for the header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate padding days for the start of the month
  const startPadding = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    return getDay(firstDay); // 0 for Sunday, 1 for Monday, etc.
  }, [currentMonth]);

  // Filter tasks for the current month
  const monthlyTasks = useMemo(() => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;

      const dueDate = new Date(task.dueDate);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      return dueDate >= monthStart && dueDate <= monthEnd;
    });
  }, [tasks, currentMonth]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    return monthlyTasks.reduce((acc, task) => {
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const dayKey = format(dueDate, 'yyyy-MM-dd');

        if (!acc[dayKey]) {
          acc[dayKey] = [];
        }

        acc[dayKey].push(task);
      }

      return acc;
    }, {} as Record<string, Task[]>);
  }, [monthlyTasks]);

  // Handle navigation
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
    setSelectedDay(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
    setSelectedDay(null);
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDay(null);
  }, []);

  // Handle day selection
  const handleDayClick = useCallback((day: Date) => {
    setSelectedDay(prev => isSameDay(prev || new Date(0), day) ? null : day);
  }, []);

  // Get tasks for the selected day
  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];

    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    return tasksByDay[dayKey] || [];
  }, [selectedDay, tasksByDay]);

  return (
    <TimelineErrorBoundary>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>

            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToCurrentMonth}>
                <Calendar className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Names */}
            {dayNames.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {day}
              </div>
            ))}

            {/* Padding for start of month */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}

            {/* Days of the month */}
            {daysInMonth.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay[dayKey] || [];
              const isSelected = selectedDay && isSameDay(day, selectedDay);

              return (
                <div
                  key={dayKey}
                  className={cn(
                    "aspect-square border rounded-md p-1 cursor-pointer hover:bg-muted/50 transition-colors",
                    isToday(day) && "border-primary",
                    isSelected && "bg-primary/10 border-primary",
                    dayTasks.length > 0 && "font-medium"
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex flex-col h-full">
                    <div className="text-right text-xs">
                      {format(day, 'd')}
                    </div>

                    {dayTasks.length > 0 && (
                      <div className="mt-auto">
                        <div className="text-xs text-center bg-primary/20 rounded-sm py-0.5">
                          {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        {/* Selected Day Tasks */}
        {selectedDay && (
          <CardFooter className="flex flex-col items-stretch border-t pt-4">
            <h3 className="text-sm font-medium mb-2">
              Tasks for {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </h3>

            <div className="h-[200px]">
              <ChunkedTimelineView
                tasks={selectedDayTasks}
                height={200}
                onTaskClick={onTaskClick}
                showControls={false}
                title=""
              />
            </div>
          </CardFooter>
        )}
      </Card>
    </TimelineErrorBoundary>
  );
}

export default React.memo(MonthlyTimelineView);
