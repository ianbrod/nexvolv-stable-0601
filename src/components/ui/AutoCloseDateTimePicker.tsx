"use client";

import * as React from "react";
import { DateTimePicker } from "@/components/ui/DateTimePicker";

interface AutoCloseDateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  onTimeSelected?: () => void;
  disabled?: (date: Date) => boolean;
  timeStep?: 15 | 30 | 60;
  timeRange?: { startHour: number; endHour: number };
}

export function AutoCloseDateTimePicker({
  value,
  onChange,
  onTimeSelected,
  disabled,
  timeStep,
  timeRange,
}: AutoCloseDateTimePickerProps) {
  // Track if a date has been selected but time hasn't been selected yet
  const [dateSelected, setDateSelected] = React.useState(false);
  // Store the last value to detect changes
  const lastValueRef = React.useRef<Date | null>(null);

  // Custom onChange handler that detects when time is selected
  const handleChange = (date: Date | null) => {
    onChange(date);
    
    if (!date) {
      setDateSelected(false);
      lastValueRef.current = null;
      return;
    }

    const lastValue = lastValueRef.current;
    
    // If we had a previous value and the hours or minutes changed,
    // it means the time was selected
    if (lastValue && 
        (lastValue.getHours() !== date.getHours() || 
         lastValue.getMinutes() !== date.getMinutes())) {
      // Time was selected, trigger the callback
      if (onTimeSelected) {
        onTimeSelected();
      }
      setDateSelected(false);
    } 
    // If we didn't have a previous value or only the date part changed,
    // it means the date was selected
    else if (!lastValue || 
             lastValue.getDate() !== date.getDate() || 
             lastValue.getMonth() !== date.getMonth() || 
             lastValue.getFullYear() !== date.getFullYear()) {
      setDateSelected(true);
    }
    
    // Update the ref with the current value
    lastValueRef.current = date;
  };

  return (
    <DateTimePicker
      value={value}
      onChange={handleChange}
      disabled={disabled}
      timeStep={timeStep}
      timeRange={timeRange}
    />
  );
}
