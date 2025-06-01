'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateFilterProps {
  onDateFilterChange: (startDate: Date | null, endDate: Date | null) => void;
}

export function DateFilter({ onDateFilterChange }: DateFilterProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    onDateFilterChange(date, endDate);
    setIsStartOpen(false);
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    onDateFilterChange(startDate, date);
    setIsEndOpen(false);
  };

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    onDateFilterChange(null, null);
  };

  // Quick filter functions
  const setToday = () => {
    const today = new Date();
    setStartDate(startOfDay(today));
    setEndDate(endOfDay(today));
    onDateFilterChange(startOfDay(today), endOfDay(today));
  };

  const setYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setStartDate(startOfDay(yesterday));
    setEndDate(endOfDay(yesterday));
    onDateFilterChange(startOfDay(yesterday), endOfDay(yesterday));
  };

  const setLast7Days = () => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    setStartDate(startOfDay(sevenDaysAgo));
    setEndDate(endOfDay(today));
    onDateFilterChange(startOfDay(sevenDaysAgo), endOfDay(today));
  };

  const setLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    setStartDate(startOfDay(thirtyDaysAgo));
    setEndDate(endOfDay(today));
    onDateFilterChange(startOfDay(thirtyDaysAgo), endOfDay(today));
  };

  return (
    <div className="space-y-3">
      {/* Quick filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={setToday}
          className={cn(
            startDate && endDate &&
            startDate.toDateString() === endDate.toDateString() &&
            startDate.toDateString() === new Date().toDateString() ? "bg-muted" : ""
          )}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setYesterday}
          className={cn(
            startDate && endDate &&
            startDate.toDateString() === endDate.toDateString() &&
            startDate.toDateString() === subDays(new Date(), 1).toDateString() ? "bg-muted" : ""
          )}
        >
          Yesterday
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setLast7Days}
          className={cn(
            startDate && endDate &&
            startDate.toDateString() === subDays(new Date(), 7).toDateString() ? "bg-muted" : ""
          )}
        >
          Last 7 days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={setLast30Days}
          className={cn(
            startDate && endDate &&
            startDate.toDateString() === subDays(new Date(), 30).toDateString() ? "bg-muted" : ""
          )}
        >
          Last 30 days
        </Button>
      </div>

      {/* Custom date range */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PP') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <span className="text-muted-foreground">to</span>

        <div className="flex items-center">
          <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PP') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate || undefined}
                onSelect={handleEndDateChange}
                initialFocus
                disabled={(date) => startDate ? date < startDate : false}
              />
            </PopoverContent>
          </Popover>
        </div>

        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearFilters}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
