'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CalendarProps {
  mode?: 'single';
  selected?: Date | null;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  disabled?: (date: Date) => boolean;
}

export function Calendar({
  mode = 'single',
  selected,
  onSelect,
  className,
  disabled,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(selected || new Date());
  
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };
  
  const handleSelectDate = (date: Date) => {
    if (disabled?.(date)) return;
    onSelect?.(date);
  };
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate days from previous month to fill first row
  const firstDayOfMonth = monthStart.getDay();
  const prevMonthDays = firstDayOfMonth > 0 
    ? eachDayOfInterval({ 
        start: subMonths(monthStart, 1), 
        end: subMonths(monthStart, 1) 
      }).slice(-firstDayOfMonth)
    : [];
  
  // Calculate days from next month to fill last row
  const lastDayOfMonth = monthEnd.getDay();
  const nextMonthDays = lastDayOfMonth < 6 
    ? eachDayOfInterval({ 
        start: addMonths(monthEnd, 0), 
        end: addMonths(monthEnd, 0) 
      }).slice(1, 7 - lastDayOfMonth)
    : [];
  
  const allDays = [...prevMonthDays, ...days, ...nextMonthDays];
  
  // Split days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  
  return (
    <div className={cn('p-3', className)}>
      <div className="flex justify-center pt-1 relative items-center mb-4">
        <Button
          variant="outline"
          className="absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handlePreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
        <Button
          variant="outline"
          className="absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handleNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className="flex w-full">
            {daysOfWeek.map(day => (
              <th key={day} className="text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex} className="flex w-full mt-2">
              {week.map((day, dayIndex) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelectedDay = selected ? isSameDay(day, selected) : false;
                const isTodayDate = isToday(day);
                const isDisabled = disabled?.(day) || false;
                
                return (
                  <td key={dayIndex} className="text-center relative p-0 text-sm w-9">
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-9 w-9 p-0 font-normal',
                        !isCurrentMonth && 'text-muted-foreground opacity-50',
                        isSelectedDay && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                        isTodayDate && !isSelectedDay && 'bg-accent text-accent-foreground',
                        isDisabled && 'text-muted-foreground opacity-50 cursor-not-allowed'
                      )}
                      disabled={isDisabled}
                      onClick={() => handleSelectDate(day)}
                    >
                      {format(day, 'd')}
                    </Button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}