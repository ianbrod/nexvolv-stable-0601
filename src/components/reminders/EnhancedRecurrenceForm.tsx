'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ReminderFormValues, RecurrenceType, MonthlyType, TerminationType } from '@/lib/schemas/reminders';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnhancedRecurrenceFormProps {
  form: UseFormReturn<ReminderFormValues>;
}

const WEEKDAYS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const WEEK_NUMBERS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: '5th' },
  { value: -1, label: 'Last' },
];

export function EnhancedRecurrenceForm({ form }: EnhancedRecurrenceFormProps) {
  const recurrence = form.watch('recurrence');
  const terminationType = form.watch('terminationType');
  const monthlyType = form.watch('monthlyType');
  const weeklyDays = form.watch('weeklyDays');

  const handleWeeklyDayToggle = (dayValue: string, checked: boolean) => {
    const currentDays = weeklyDays ? weeklyDays.split(',') : [];
    let newDays: string[];

    if (checked) {
      newDays = [...currentDays, dayValue].sort((a, b) => parseInt(a) - parseInt(b));
    } else {
      newDays = currentDays.filter(day => day !== dayValue);
    }

    form.setValue('weeklyDays', newDays.join(','));
  };

  return (
    <div className="space-y-4">
      {/* Recurrence Pattern */}
      <FormField
        control={form.control}
        name="recurrence"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recurrence Pattern</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recurrence pattern" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Recurrence Interval */}
      {recurrence && (
        <FormField
          control={form.control}
          name="recurrenceInterval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Repeat every {recurrence === 'daily' ? 'day(s)' : 
                           recurrence === 'weekly' ? 'week(s)' : 
                           recurrence === 'monthly' ? 'month(s)' : 'year(s)'}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  {...field}
                  value={field.value || 1}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Weekly Days Selection */}
      {recurrence === 'weekly' && (
        <div className="space-y-2">
          <FormLabel>Repeat on</FormLabel>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const isChecked = weeklyDays?.split(',').includes(day.value) || false;
              return (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => 
                      handleWeeklyDayToggle(day.value, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {day.label.slice(0, 3)}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Type Selection */}
      {recurrence === 'monthly' && (
        <>
          <FormField
            control={form.control}
            name="monthlyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Pattern</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'date'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select monthly pattern" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="date">Same date each month</SelectItem>
                    <SelectItem value="weekday">Same weekday each month</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Monthly Weekday Configuration */}
          {monthlyType === 'weekday' && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyWeekNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select week" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WEEK_NUMBERS.map((week) => (
                          <SelectItem key={week.value} value={week.value.toString()}>
                            {week.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyWeekday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString() || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WEEKDAYS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </>
      )}

      {/* Termination Options */}
      <div className="space-y-3">
        <FormLabel>End recurrence</FormLabel>
        
        <FormField
          control={form.control}
          name="terminationType"
          render={({ field }) => (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="never"
                  value="never"
                  checked={field.value === 'never'}
                  onChange={() => field.onChange('never')}
                  className="h-4 w-4 text-primary"
                />
                <label htmlFor="never" className="text-sm">Never</label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="after"
                  value="after"
                  checked={field.value === 'after'}
                  onChange={() => field.onChange('after')}
                  className="h-4 w-4 text-primary"
                />
                <label htmlFor="after" className="text-sm">After</label>
                {terminationType === 'after' && (
                  <FormField
                    control={form.control}
                    name="maxOccurrences"
                    render={({ field: occurrenceField }) => (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          className="w-20"
                          {...occurrenceField}
                          value={occurrenceField.value || ''}
                          onChange={(e) => occurrenceField.onChange(parseInt(e.target.value) || undefined)}
                        />
                        <span className="text-sm">occurrences</span>
                      </div>
                    )}
                  />
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="on"
                  value="on"
                  checked={field.value === 'on'}
                  onChange={() => field.onChange('on')}
                  className="h-4 w-4 text-primary"
                />
                <label htmlFor="on" className="text-sm">On</label>
                {terminationType === 'on' && (
                  <FormField
                    control={form.control}
                    name="recurrenceEndDate"
                    render={({ field: dateField }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !dateField.value && "text-muted-foreground"
                            )}
                          >
                            {dateField.value ? (
                              format(dateField.value, "PPP")
                            ) : (
                              <span>Pick an end date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateField.value}
                            onSelect={dateField.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                )}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
