"use client";

import * as React from "react";
import { Button } from "@/components/ui/button"; // Assuming exists
import { Calendar } from "@/components/ui/calendar"; // Assuming exists
import { ScrollArea } from "@/components/ui/scroll-area"; // Assuming exists
import { format, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useTimeSlotSettings } from "@/stores/viewPreferencesStore";

interface DateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  disabled?: (date: Date) => boolean;
  timeStep?: 15 | 30 | 60; // Time slot interval in minutes
  timeRange?: { startHour: number; endHour: number }; // Inclusive hour range (0-23)
}

export function DateTimePicker({
  value, // value is expected to be Date | null from react-hook-form
  onChange, // onChange expects (date: Date | null) => void
  disabled,
  timeStep = 30,
  timeRange, // Will be overridden by store values if not provided
}: DateTimePickerProps) {
  // Get time slot settings from store with fallback
  const { timeSlotStartHour, timeSlotEndHour } = useTimeSlotSettings();

  // Use store values if timeRange prop is not provided, with fallback to defaults
  const effectiveTimeRange = React.useMemo(() => {
    if (timeRange) {
      return timeRange;
    }
    // Always use fallback values to ensure time picker works
    // Even if store hasn't hydrated yet
    return {
      startHour: 5,  // Always use default 5 AM
      endHour: 23    // Always use default 11 PM
    };
  }, [timeRange]);
  // Determine the date part for the calendar display, default to today if value is null/invalid
  const displayDate = (value instanceof Date && !isNaN(value.getTime())) ? startOfDay(value) : startOfDay(new Date());

  // Determine the time part for highlighting the selected time slot (using 12-hour format) with try-catch
  let displayTime: string | null = null;
  try {
    // Re-verify value validity right before formatting
    if (value instanceof Date && !isNaN(value.getTime())) {
      displayTime = format(value, "h:mm a");
    }
  } catch (error) {
    console.error("[DateTimePicker] Error formatting displayTime:", error, "Value:", value);
    // displayTime remains null as fallback
  }

  // Generate time slots based on effective time range
  const timeSlots = React.useMemo(() => {
    const slots = [];

    for (let hour = effectiveTimeRange.startHour; hour <= effectiveTimeRange.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += timeStep) {
        if (hour === effectiveTimeRange.endHour && minute > 0) continue;
        try { // Add try-catch around format
          const timeSlotDate = setMinutes(setHours(new Date(), hour), minute);
          const formattedSlot = format(timeSlotDate, "h:mm a");
          slots.push(formattedSlot);
        } catch (error) {
          console.error("[DateTimePicker] Error formatting time slot:", error, "Hour:", hour, "Minute:", minute);
          // Optionally push a fallback string like "Error" or skip this slot
          // slots.push("Error");
        }
      }
    }
    return slots;
  }, [timeStep, effectiveTimeRange]);

  const handleDateSelect = (selectedDay: Date | undefined) => {
    if (!selectedDay) {
      onChange(null); // Allow clearing the date
      return;
    }

    const newDatePart = startOfDay(selectedDay);
    let combinedDate: Date;

    // Check if the current external value has a time component
    if (value instanceof Date && !isNaN(value.getTime())) {
      // Keep existing time, just change the date part
      let hours = value.getHours();
      let minutes = value.getMinutes();
      combinedDate = setMinutes(setHours(newDatePart, hours), minutes);
    } else {
      // No existing time or invalid value, set to midnight of the new date
      combinedDate = newDatePart;
    }
    // Ensure seconds and milliseconds are zeroed out
    combinedDate = setSeconds(combinedDate, 0);
    combinedDate = setMilliseconds(combinedDate, 0);
    onChange(combinedDate); // Update the external state
  };

  const handleTimeSelect = (timeString: string) => { // timeString is "h:mm a"
    // Parse the selected time string (e.g., "5:30 PM")
    const parts = timeString.match(/(\d{1,2}):(\d{2})\s(AM|PM)/);
    if (!parts) return; // Should not happen with generated slots

    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    const ampm = parts[3];

    // Convert 12-hour format to 24-hour format
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0; // Midnight case

    // Use the date part from the current displayDate (derived from value prop)
    let combinedDate = setHours(displayDate, hours);
    combinedDate = setMinutes(combinedDate, minutes);
    combinedDate = setSeconds(combinedDate, 0); // Zero out seconds
    combinedDate = setMilliseconds(combinedDate, 0); // Zero out milliseconds

    onChange(combinedDate); // Update the external state
  };

  return (
    <div className="rounded-lg border border-border">
      <div className="flex max-sm:flex-col">
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={displayDate} // Calendar selection is based on displayDate
          onSelect={handleDateSelect}
          className="p-2 sm:pe-5 bg-background"
          disabled={disabled}
        />
        {/* Time Picker */}
        <div className="relative w-full max-sm:h-48 sm:w-40">
          <div className="absolute inset-0 border-border py-4 max-sm:border-t">
            <ScrollArea className="h-full border-border sm:border-s">
              <div className="space-y-3">
                <div className="flex h-5 shrink-0 items-center px-5">
                  <p className="text-sm font-medium">
                    {/* Wrap header format in IIFE with try-catch */}
                    {(() => {
                      try {
                        // displayDate should be valid here based on earlier check, but add try-catch for safety
                        if (displayDate instanceof Date && !isNaN(displayDate.getTime())) {
                           return format(displayDate, "EEEE, d");
                        }
                        return "Select Date";
                      } catch (error) {
                        console.error("[DateTimePicker] Error formatting displayDate header:", error, "displayDate:", displayDate);
                        return "Error Date"; // Fallback display
                      }
                    })()}
                  </p>
                </div>
                <div className="grid gap-1.5 px-5 max-sm:grid-cols-3"> {/* Adjusted grid cols */}
                  {timeSlots.map((timeSlot) => (
                    <Button
                      key={timeSlot}
                      variant={displayTime === timeSlot ? "default" : "outline"} // Highlight based on displayTime
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => handleTimeSelect(timeSlot)}
                      // Add disabled logic here if needed based on availability
                    >
                      {timeSlot}
                    </Button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}