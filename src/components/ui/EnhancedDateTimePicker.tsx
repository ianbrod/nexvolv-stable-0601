"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useTimeSlotSettings } from "@/stores/viewPreferencesStore";

interface EnhancedDateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  onComplete?: () => void; // Callback when both date and time are selected
  disabled?: (date: Date) => boolean;
  timeStep?: 15 | 30 | 60; // Time slot interval in minutes
  timeRange?: { startHour: number; endHour: number }; // Inclusive hour range (0-23)
}

export function EnhancedDateTimePicker({
  value,
  onChange,
  onComplete,
  disabled,
  timeStep = 30,
  timeRange, // Will be overridden by store values if not provided
}: EnhancedDateTimePickerProps) {
  // Get time slot settings from store
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
  // Track selection state
  const [selectionState, setSelectionState] = React.useState<"initial" | "dateSelected" | "complete">("initial");

  // Determine the date part for the calendar display
  const displayDate = (value instanceof Date && !isNaN(value.getTime()))
    ? startOfDay(value)
    : startOfDay(new Date());

  // Determine the time part for highlighting the selected time slot
  let displayTime: string | null = null;
  try {
    if (value instanceof Date && !isNaN(value.getTime())) {
      displayTime = format(value, "h:mm a");
    }
  } catch (error) {
    console.error("[EnhancedDateTimePicker] Error formatting displayTime:", error);
  }

  // Generate time slots based on effective time range
  const timeSlots = React.useMemo(() => {
    const slots = [];

    for (let hour = effectiveTimeRange.startHour; hour <= effectiveTimeRange.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += timeStep) {
        if (hour === effectiveTimeRange.endHour && minute > 0) continue;
        try {
          const timeSlotDate = setMinutes(setHours(new Date(), hour), minute);
          const formattedSlot = format(timeSlotDate, "h:mm a");
          slots.push(formattedSlot);
        } catch (error) {
          console.error("[EnhancedDateTimePicker] Error formatting time slot:", error);
        }
      }
    }
    return slots;
  }, [timeStep, effectiveTimeRange]);

  // Handle date selection
  const handleDateSelect = (selectedDay: Date | undefined) => {
    if (!selectedDay) {
      onChange(null);
      setSelectionState("initial");
      return;
    }

    const newDatePart = startOfDay(selectedDay);
    let combinedDate: Date;

    // Check if the current value has a time component
    if (value instanceof Date && !isNaN(value.getTime())) {
      // Keep existing time, just change the date part
      let hours = value.getHours();
      let minutes = value.getMinutes();
      combinedDate = setMinutes(setHours(newDatePart, hours), minutes);
    } else {
      // No existing time, set to midnight of the new date
      combinedDate = newDatePart;
    }

    // Ensure seconds and milliseconds are zeroed out
    combinedDate = setSeconds(combinedDate, 0);
    combinedDate = setMilliseconds(combinedDate, 0);

    onChange(combinedDate);
    setSelectionState("dateSelected");

    // Auto-scroll to the current time or a reasonable default time
    if (timeSlotRef.current) {
      const currentHour = new Date().getHours();
      const closestHour = Math.max(timeRange.startHour, Math.min(currentHour, timeRange.endHour));
      const scrollIndex = Math.floor((closestHour - timeRange.startHour) * (60 / timeStep));

      setTimeout(() => {
        const buttons = timeSlotRef.current?.querySelectorAll('button');
        if (buttons && buttons.length > 0) {
          const targetIndex = Math.min(scrollIndex, buttons.length - 1);
          buttons[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Handle time selection
  const handleTimeSelect = (timeString: string) => {
    // Parse the selected time string (e.g., "5:30 PM")
    const parts = timeString.match(/(\d{1,2}):(\d{2})\s(AM|PM)/);
    if (!parts) return;

    let hours = parseInt(parts[1], 10);
    const minutes = parseInt(parts[2], 10);
    const ampm = parts[3];

    // Convert 12-hour format to 24-hour format
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    // Create a new date with the selected time
    let newDate: Date;

    if (value instanceof Date && !isNaN(value.getTime())) {
      // Keep the existing date part, just change the time
      newDate = new Date(value);
    } else {
      // No existing date, use today
      newDate = startOfDay(new Date());
    }

    newDate = setHours(newDate, hours);
    newDate = setMinutes(newDate, minutes);
    newDate = setSeconds(newDate, 0);
    newDate = setMilliseconds(newDate, 0);

    onChange(newDate);
    setSelectionState("complete");

    // Trigger the onComplete callback after a short delay
    // This allows the UI to update before potentially closing the popover
    if (onComplete) {
      setTimeout(() => {
        onComplete();
      }, 150);
    }
  };

  // Reference to the time slots container for scrolling
  const timeSlotRef = React.useRef<HTMLDivElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Set up wheel event handler for scrolling
  React.useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default only if we're hovering over the component
      e.preventDefault();

      // Get the scroll container (the element that actually scrolls)
      const scrollContainer = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (!scrollContainer) return;

      // Scroll by the wheel delta
      scrollContainer.scrollTop += e.deltaY;
    };

    scrollArea.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      scrollArea.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="rounded-lg border border-border">
      <div className="flex max-sm:flex-col">
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={displayDate}
          onSelect={handleDateSelect}
          className="p-2 sm:pe-5 bg-background"
          disabled={disabled}
        />

        {/* Time Picker */}
        <div className="relative w-full max-sm:h-48 sm:w-40">
          <div className="absolute inset-0 border-border py-4 max-sm:border-t">
            <div ref={scrollAreaRef} className="time-picker-scroll-area h-full">
              <ScrollArea className="h-full border-border sm:border-s" type="always">
              <div className="space-y-3" ref={timeSlotRef}>
                <div className="flex h-5 shrink-0 items-center px-5">
                  <p className="text-sm font-medium">
                    {selectionState === "dateSelected" ? "Select time" : "Time"}
                  </p>
                </div>
                <div className="grid gap-1.5 px-5 max-sm:grid-cols-3">
                  {timeSlots.map((timeSlot) => (
                    <Button
                      key={timeSlot}
                      variant={displayTime === timeSlot ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-full text-xs h-8",
                        selectionState === "dateSelected" && "animate-pulse-subtle"
                      )}
                      onClick={() => handleTimeSelect(timeSlot)}
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
    </div>
  );
}
