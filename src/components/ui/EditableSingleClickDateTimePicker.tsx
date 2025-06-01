'use client';

import * as React from 'react';
import { EditableDateTimePicker } from './EditableDateTimePicker';

interface EditableSingleClickDateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  onComplete?: () => void;
  disabled?: (date: Date) => boolean;
  timeStep?: 15 | 30 | 60;
  timeRange?: { startHour: number; endHour: number };
}

export function EditableSingleClickDateTimePicker({
  value,
  onChange,
  onComplete,
  disabled,
  timeStep,
  timeRange,
}: EditableSingleClickDateTimePickerProps) {
  // Handle the date/time selection
  const handleChange = (date: Date | null) => {
    onChange(date);
  };

  // Handle the completion of the selection
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <EditableDateTimePicker
      value={value}
      onChange={handleChange}
      onComplete={handleComplete}
      disabled={disabled}
      timeStep={timeStep}
      timeRange={timeRange}
    />
  );
}
